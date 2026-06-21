const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { recalculateAIThreshold } = require('../utils/thresholdHelper');

const router = express.Router();

router.use(authenticateToken);

// GET /api/sales-orders - View allowed for everyone authenticated
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const status = req.query.status;
  const skip = (page - 1) * limit;

  try {
    const where = {
      OR: [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.salesOrder.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.salesOrder.count({ where });

    res.json({
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch sales orders error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/sales-orders/:id - Fetch individual order with items
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: { select: { name: true, sku: true, price: true, onHandQty: true, availableQty: true } }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Sales order not found.' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get sales order detail error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/sales-orders - Create sales order. ADMIN and SALES roles only.
router.post('/', authorizeRoles('ADMIN', 'SALES'), async (req, res) => {
  const { customerId, items } = req.body;

  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Customer ID and at least one item are required.' });
  }

  try {
    // Check if customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return res.status(400).json({ message: 'Customer not found.' });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let totalAmount = 0;
    const preparedItems = [];
    const createdPOs = [];
    const createdMOs = [];

    const result = await prisma.$transaction(async (tx) => {
      // Prevent concurrent race conditions on generated order numbers
      await tx.$executeRawUnsafe('LOCK TABLE "SalesOrder", "PurchaseOrder", "ManufacturingOrder" IN SHARE ROW EXCLUSIVE MODE;');

      let count = await tx.salesOrder.count();
      let mfgCount = await tx.manufacturingOrder.count();
      let poCount = await tx.purchaseOrder.count();

      let soIndex = count + 1;
      let orderNumber = `SO-${todayStr}-${String(soIndex).padStart(4, '0')}`;
      while (await tx.salesOrder.findUnique({ where: { orderNumber } })) {
        soIndex++;
        orderNumber = `SO-${todayStr}-${String(soIndex).padStart(4, '0')}`;
      }

      for (const item of items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod) {
          throw new Error(`Product not found for ID: ${item.productId}`);
        }
        const qty = parseFloat(item.quantity) || 1;
        const price = parseFloat(item.price) || prod.price;
        totalAmount += qty * price;

        preparedItems.push({
          productId: item.productId,
          quantity: qty,
          price,
        });

        // Stock reservation logic:
        const available = prod.availableQty || 0;
        const toReserve = Math.min(qty, available > 0 ? available : 0);
        const deficit = qty - toReserve;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            reservedQty: { increment: toReserve },
            availableQty: { decrement: toReserve }
          }
        });

        // Deficit procurement:
        if (deficit > 0 && item.procurement) {
          const { source, vendorId, usedAi, aiExplanation } = item.procurement;

          if (source === 'manufacturer') {
            const bom = await tx.bOM.findFirst({
              where: { productId: item.productId }
            });
            if (!bom) {
              throw new Error(`No Bill of Materials (BOM) found for product ${prod.name}. Cannot auto-manufacture.`);
            }

            let mfgIndex = mfgCount + 1;
            let moNumber = `MO-${todayStr}-${String(mfgIndex).padStart(4, '0')}`;
            while (await tx.manufacturingOrder.findUnique({ where: { moNumber } })) {
              mfgIndex++;
              moNumber = `MO-${todayStr}-${String(mfgIndex).padStart(4, '0')}`;
            }
            mfgCount = mfgIndex;

            const mo = await tx.manufacturingOrder.create({
              data: {
                moNumber,
                productId: item.productId,
                bomId: bom.id,
                quantity: deficit,
                status: 'CONFIRMED',
              }
            });

            // Auto-generate Work Orders from operations
            const ops = await tx.operation.findMany({
              orderBy: { sequence: 'asc' },
              take: 4
            });

            if (ops.length > 0) {
              const wos = ops.map((op, idx) => ({
                moNumber,
                manufacturingOrderId: mo.id,
                operationId: op.id,
                name: `Perform ${op.name}`,
                workCenterId: op.workCenterId,
                sequence: idx + 1,
                status: 'PENDING',
                duration: 0.0,
              }));
              await tx.workOrder.createMany({ data: wos });
            }

            createdMOs.push(mo);
          } else if (source === 'vendor') {
            if (!vendorId) {
              throw new Error(`Vendor ID is required to procure remaining ${deficit} items of ${prod.name}.`);
            }
            const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
            if (!vendor) {
              throw new Error(`Vendor with ID ${vendorId} not found.`);
            }

            let poIndex = poCount + 1;
            let poNumber = `PO-${todayStr}-${String(poIndex).padStart(4, '0')}`;
            while (await tx.purchaseOrder.findUnique({ where: { orderNumber: poNumber } })) {
              poIndex++;
              poNumber = `PO-${todayStr}-${String(poIndex).padStart(4, '0')}`;
            }
            poCount = poIndex;

            const totalCost = deficit * prod.cost;

            const po = await tx.purchaseOrder.create({
              data: {
                orderNumber: poNumber,
                vendorId,
                status: 'DRAFT',
                totalAmount: totalCost,
                items: {
                  create: [{
                    productId: item.productId,
                    quantity: deficit,
                    cost: prod.cost,
                  }]
                }
              },
              include: { items: true }
            });

            if (usedAi) {
              await tx.vendorRecommendation.create({
                data: {
                  purchaseOrderId: po.id,
                  productId: item.productId,
                  recommendedVendorId: vendorId,
                  score: vendor.finalScore || 0,
                  explanation: aiExplanation || `Selected ${vendor.name} based on AI vendor performance rankings.`
                }
              });
            }

            createdPOs.push(po);
          }
        }
      }

      const createdOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId,
          status: 'DRAFT',
          totalAmount,
          items: {
            create: preparedItems
          }
        },
        include: {
          items: true
        }
      });

      return { createdOrder, createdPOs, createdMOs };
    });

    // Write audits and send socket notifications
    await logAudit(prisma, {
      tableName: 'SalesOrder',
      recordId: result.createdOrder.id,
      action: 'CREATE',
      newValue: result.createdOrder,
      userId: req.user.id,
    });

    if (req.io) {
      req.io.to('ADMIN').to('OWNER').to('SALES').to('INVENTORY').emit('notification', {
        title: 'New Sales Order Created',
        message: `Order ${result.createdOrder.orderNumber} created. Available products reserved.`,
        type: 'success',
        timestamp: new Date()
      });
    }

    for (const po of result.createdPOs) {
      await logAudit(prisma, {
        tableName: 'PurchaseOrder',
        recordId: po.id,
        action: 'CREATE',
        newValue: po,
        userId: req.user.id,
      });

      if (req.io) {
        req.io.to('ADMIN').to('OWNER').to('PURCHASE').to('INVENTORY').emit('notification', {
          title: 'Deficit Purchase Order Spawned',
          message: `Draft PO ${po.orderNumber} created to procure stock deficit.`,
          type: 'warning',
          timestamp: new Date()
        });
      }
    }

    for (const mo of result.createdMOs) {
      await logAudit(prisma, {
        tableName: 'ManufacturingOrder',
        recordId: mo.id,
        action: 'CREATE',
        newValue: mo,
        userId: req.user.id,
      });

      if (req.io) {
        req.io.to('ADMIN').to('OWNER').to('MANUFACTURING').to('INVENTORY').emit('notification', {
          title: 'Deficit Manufacturing Order Spawned',
          message: `Confirmed MO ${mo.moNumber} created to resolve stock deficit.`,
          type: 'warning',
          timestamp: new Date()
        });
      }
    }

    res.status(201).json(result.createdOrder);
  } catch (error) {
    console.error('Create sales order error:', error);
    res.status(500).json({ message: error.message || 'Internal server error.' });
  }
});

// PUT /api/sales-orders/:id - ADMIN and SALES roles only.
router.put('/:id', authorizeRoles('ADMIN', 'SALES'), async (req, res) => {
  const { id } = req.params;
  const { status, customerId, items } = req.body;

  try {
    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Sales order not found.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Re-calculate total amount if items are being updated
      let totalAmount = existing.totalAmount;
      if (items && Array.isArray(items)) {
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });

        totalAmount = 0;
        const preparedItems = [];
        for (const item of items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          const qty = parseFloat(item.quantity) || 1;
          const price = parseFloat(item.price) || (prod ? prod.price : 0);
          totalAmount += qty * price;

          preparedItems.push({
            productId: item.productId,
            quantity: qty,
            price,
          });
        }

        await tx.salesOrderItem.createMany({
          data: preparedItems.map(pi => ({
            salesOrderId: id,
            productId: pi.productId,
            quantity: pi.quantity,
            price: pi.price,
          }))
        });
      }

      // Check status transitions for stock adjustments:
      if (status === 'DELIVERED' && existing.status !== 'DELIVERED') {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              onHandQty: { decrement: item.quantity },
              reservedQty: { decrement: item.quantity }
            }
          });

          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              transactionType: 'SALES_DELIVERY',
              quantity: -item.quantity,
              referenceId: existing.orderNumber,
              description: `Sales delivery for ${existing.orderNumber}`,
              userRefId: req.user.id
            }
          });

          await recalculateAIThreshold(tx, item.productId);
        }
      } else if (status === 'CANCELLED' && existing.status !== 'CANCELLED' && existing.status !== 'DELIVERED') {
        // Release reservation
        for (const item of existing.items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (prod) {
            const toRelease = Math.min(item.quantity, prod.reservedQty);
            await tx.product.update({
              where: { id: item.productId },
              data: {
                reservedQty: { decrement: toRelease },
                availableQty: { increment: toRelease }
              }
            });
          }
        }
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: {
          customerId: customerId || undefined,
          status: status || undefined,
          totalAmount: items ? totalAmount : undefined,
        },
        include: {
          items: true
        }
      });

      return updatedOrder;
    });

    await logAudit(prisma, {
      tableName: 'SalesOrder',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    if (req.io) {
      req.io.to('ADMIN').to('OWNER').to('SALES').to('INVENTORY').emit('notification', {
        title: 'Sales Order Updated',
        message: `Order ${updated.orderNumber} status changed to ${updated.status}.`,
        type: 'success',
        timestamp: new Date()
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update sales order error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/sales-orders/:id - ADMIN and SALES roles only.
router.delete('/:id', authorizeRoles('ADMIN', 'SALES'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.salesOrder.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Sales order not found.' });
    }

    await prisma.salesOrder.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'SalesOrder',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Sales order deleted successfully.' });
  } catch (error) {
    console.error('Delete sales order error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
