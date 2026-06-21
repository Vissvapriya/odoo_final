const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { recalculateAIThreshold } = require('../utils/thresholdHelper');

const router = express.Router();

router.use(authenticateToken);

// GET /api/purchase-orders - View allowed for everyone authenticated
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
        { vendor: { name: { contains: search, mode: 'insensitive' } } },
      ],
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.purchaseOrder.count({ where });

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
    console.error('Fetch purchase orders error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/purchase-orders/:id - Fetch individual order with items
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: {
          include: {
            product: { select: { name: true, sku: true, cost: true, onHandQty: true, availableQty: true } }
          }
        },
        recommendations: {
          include: {
            recommendedVendor: { select: { name: true, finalScore: true } }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found.' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get purchase order detail error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/purchase-orders - Create purchase order. ADMIN only.
router.post('/', authorizeRoles('ADMIN'), async (req, res) => {
  const { vendorId, items } = req.body;

  if (!vendorId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Vendor ID and at least one item are required.' });
  }

  try {
    // Check if vendor exists
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return res.status(400).json({ message: 'Vendor not found.' });
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let totalAmount = 0;
    const preparedItems = [];

    for (const item of items) {
      const prod = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!prod) {
        return res.status(400).json({ message: `Product not found for ID: ${item.productId}` });
      }
      const qty = parseFloat(item.quantity) || 1;
      const cost = parseFloat(item.cost) || prod.cost;
      totalAmount += qty * cost;

      preparedItems.push({
        productId: item.productId,
        quantity: qty,
        cost,
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "PurchaseOrder" IN SHARE ROW EXCLUSIVE MODE;');

      const count = await tx.purchaseOrder.count();
      let poIndex = count + 1;
      let orderNumber = `PO-${todayStr}-${String(poIndex).padStart(4, '0')}`;
      while (await tx.purchaseOrder.findUnique({ where: { orderNumber } })) {
        poIndex++;
        orderNumber = `PO-${todayStr}-${String(poIndex).padStart(4, '0')}`;
      }

      const createdOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          vendorId,
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
      return createdOrder;
    });

    await logAudit(prisma, {
      tableName: 'PurchaseOrder',
      recordId: order.id,
      action: 'CREATE',
      newValue: order,
      userId: req.user.id,
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/purchase-orders/:id - ADMIN and PURCHASE roles only.
router.put('/:id', authorizeRoles('ADMIN', 'PURCHASE'), async (req, res) => {
  const { id } = req.params;
  const { status, vendorId, items } = req.body;

  if (status === 'FULLY_RECEIVED' && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Only administrators can receive purchase orders.' });
  }

  try {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let totalAmount = existing.totalAmount;
      if (items && Array.isArray(items)) {
        // Delete items
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

        totalAmount = 0;
        const preparedItems = [];
        for (const item of items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          const qty = parseFloat(item.quantity) || 1;
          const cost = parseFloat(item.cost) || (prod ? prod.cost : 0);
          totalAmount += qty * cost;

          preparedItems.push({
            productId: item.productId,
            quantity: qty,
            cost,
          });
        }

        // Re-create items
        await tx.purchaseOrderItem.createMany({
          data: preparedItems.map(pi => ({
            purchaseOrderId: id,
            productId: pi.productId,
            quantity: pi.quantity,
            cost: pi.cost,
          }))
        });
      }

      if (status === 'FULLY_RECEIVED' && existing.status !== 'FULLY_RECEIVED') {
        for (const item of existing.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              onHandQty: { increment: item.quantity },
              availableQty: { increment: item.quantity }
            }
          });

          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              transactionType: 'PURCHASE_RECEIPT',
              quantity: item.quantity,
              referenceId: existing.orderNumber,
              description: `Received goods for PO ${existing.orderNumber}`,
              userRefId: req.user.id
            }
          });

          await recalculateAIThreshold(tx, item.productId);
        }
      }

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorId: vendorId || undefined,
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
      tableName: 'PurchaseOrder',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    if (req.io) {
      req.io.to('ADMIN').to('OWNER').to('PURCHASE').to('INVENTORY').emit('notification', {
        title: 'Purchase Order Updated',
        message: `Order ${updated.orderNumber} status changed to ${updated.status}.`,
        type: 'success',
        timestamp: new Date()
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/purchase-orders/:id - ADMIN only.
router.delete('/:id', authorizeRoles('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found.' });
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'PurchaseOrder',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Purchase order deleted successfully.' });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
