const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { recalculateAIThreshold } = require('../utils/thresholdHelper');

const router = express.Router();

router.use(authenticateToken);

// ==========================================
// WORK CENTERS CRUD
// ==========================================

router.get('/work-centers', async (req, res) => {
  try {
    const wcs = await prisma.workCenter.findMany({ orderBy: { name: 'asc' } });
    res.json(wcs);
  } catch (error) {
    console.error('Fetch work centers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/work-centers', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { name, code, capacity, hourlyCost } = req.body;
  if (!name || !code) {
    return res.status(400).json({ message: 'Name and Code are required.' });
  }

  try {
    const wc = await prisma.workCenter.create({
      data: {
        name,
        code: code.toUpperCase(),
        capacity: parseFloat(capacity) || 1.0,
        hourlyCost: parseFloat(hourlyCost) || 0.0,
      }
    });

    await logAudit(prisma, {
      tableName: 'WorkCenter',
      recordId: wc.id,
      action: 'CREATE',
      newValue: wc,
      userId: req.user.id,
    });

    res.status(201).json(wc);
  } catch (error) {
    console.error('Create work center error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.put('/work-centers/:id', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { id } = req.params;
  const { name, code, capacity, hourlyCost } = req.body;

  try {
    const existing = await prisma.workCenter.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Work Center not found.' });

    const updated = await prisma.workCenter.update({
      where: { id },
      data: {
        name: name || undefined,
        code: code ? code.toUpperCase() : undefined,
        capacity: capacity !== undefined ? parseFloat(capacity) : undefined,
        hourlyCost: hourlyCost !== undefined ? parseFloat(hourlyCost) : undefined,
      }
    });

    await logAudit(prisma, {
      tableName: 'WorkCenter',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update work center error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.delete('/work-centers/:id', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.workCenter.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Work Center not found.' });

    await prisma.workCenter.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'WorkCenter',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Work Center deleted successfully.' });
  } catch (error) {
    console.error('Delete work center error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ==========================================
// OPERATIONS CRUD
// ==========================================

router.get('/operations', async (req, res) => {
  try {
    const ops = await prisma.operation.findMany({
      include: { workCenter: { select: { name: true, code: true } } },
      orderBy: { sequence: 'asc' }
    });
    res.json(ops);
  } catch (error) {
    console.error('Fetch operations error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/operations', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { name, workCenterId, setupTime, runTime, sequence } = req.body;
  if (!name || !workCenterId) {
    return res.status(400).json({ message: 'Name and Work Center ID are required.' });
  }

  try {
    const op = await prisma.operation.create({
      data: {
        name,
        workCenterId,
        setupTime: parseFloat(setupTime) || 0.0,
        runTime: parseFloat(runTime) || 0.0,
        sequence: parseInt(sequence) || 1,
      }
    });

    await logAudit(prisma, {
      tableName: 'Operation',
      recordId: op.id,
      action: 'CREATE',
      newValue: op,
      userId: req.user.id,
    });

    res.status(201).json(op);
  } catch (error) {
    console.error('Create operation error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.put('/operations/:id', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { id } = req.params;
  const { name, workCenterId, setupTime, runTime, sequence } = req.body;

  try {
    const existing = await prisma.operation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Operation not found.' });

    const updated = await prisma.operation.update({
      where: { id },
      data: {
        name: name || undefined,
        workCenterId: workCenterId || undefined,
        setupTime: setupTime !== undefined ? parseFloat(setupTime) : undefined,
        runTime: runTime !== undefined ? parseFloat(runTime) : undefined,
        sequence: sequence !== undefined ? parseInt(sequence) : undefined,
      }
    });

    await logAudit(prisma, {
      tableName: 'Operation',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update operation error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.delete('/operations/:id', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.operation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Operation not found.' });

    await prisma.operation.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'Operation',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Operation deleted successfully.' });
  } catch (error) {
    console.error('Delete operation error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});


// ==========================================
// MANUFACTURING ORDERS CRUD
// ==========================================

router.get('/orders', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const status = req.query.status;
  const skip = (page - 1) * limit;

  try {
    const where = {
      OR: [
        { moNumber: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ],
    };

    if (status) {
      where.status = status;
    }

    const orders = await prisma.manufacturingOrder.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true } },
        bom: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.manufacturingOrder.count({ where });

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
    console.error('Fetch manufacturing orders error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, sku: true, cost: true, onHandQty: true, availableQty: true } },
        bom: {
          include: {
            items: {
              include: {
                product: { select: { name: true, sku: true, onHandQty: true, availableQty: true } }
              }
            }
          }
        },
        workOrders: {
          include: {
            workCenter: { select: { name: true, code: true } },
            operation: { select: { name: true, sequence: true } },
          },
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Manufacturing order not found.' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get MO detail error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/manufacturing-orders/orders - Create MO (ADMIN and MANUFACTURING roles only)
router.post('/orders', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { productId, bomId, quantity } = req.body;

  if (!productId || !bomId || !quantity) {
    return res.status(400).json({ message: 'Product ID, BOM ID, and Quantity are required.' });
  }

  try {
    // Check if product and BOM exist
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(400).json({ message: 'Product not found.' });

    const bom = await prisma.bOM.findUnique({
      where: { id: bomId },
      include: { items: true }
    });
    if (!bom) return res.status(400).json({ message: 'BOM not found.' });

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Auto Work Orders from operations:
    // We will retrieve all standard operations in the system, or operations linked to the work centers.
    // Since operations are general in our schema, we can map the first 3 active operations as steps.
    const ops = await prisma.operation.findMany({
      orderBy: { sequence: 'asc' },
      take: 4 // Map up to 4 operations to the MO
    });

    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('LOCK TABLE "ManufacturingOrder" IN SHARE ROW EXCLUSIVE MODE;');

      const count = await tx.manufacturingOrder.count();
      let mfgIndex = count + 1;
      let moNumber = `MO-${todayStr}-${String(mfgIndex).padStart(4, '0')}`;
      while (await tx.manufacturingOrder.findUnique({ where: { moNumber } })) {
        mfgIndex++;
        moNumber = `MO-${todayStr}-${String(mfgIndex).padStart(4, '0')}`;
      }

      const createdMO = await tx.manufacturingOrder.create({
        data: {
          moNumber,
          productId,
          bomId,
          quantity: parseFloat(quantity),
          status: 'DRAFT',
        }
      });

      // Generate Work Orders
      if (ops.length > 0) {
        const wos = ops.map((op, index) => ({
          moNumber,
          manufacturingOrderId: createdMO.id,
          operationId: op.id,
          name: `Perform ${op.name}`,
          workCenterId: op.workCenterId,
          sequence: index + 1,
          status: 'PENDING',
          duration: 0.0,
        }));

        await tx.workOrder.createMany({ data: wos });
      }

      return createdMO;
    });

    // Re-fetch with work orders to log audit
    const completeMO = await prisma.manufacturingOrder.findUnique({
      where: { id: order.id },
      include: { workOrders: true }
    });

    await logAudit(prisma, {
      tableName: 'ManufacturingOrder',
      recordId: order.id,
      action: 'CREATE',
      newValue: completeMO,
      userId: req.user.id,
    });

    res.status(201).json(completeMO);
  } catch (error) {
    console.error('Create MO error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/manufacturing-orders/orders/:id - ADMIN and MANUFACTURING roles only
router.put('/orders/:id', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status === 'PRODUCTS_RECEIVED' && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Only administrators can receive completed products.' });
  }

  try {
    const existing = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        workOrders: true,
        bom: {
          include: {
            items: true
          }
        }
      }
    });

    if (!existing) return res.status(404).json({ message: 'Manufacturing order not found.' });

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'PRODUCTS_RECEIVED' && existing.status !== 'PRODUCTS_RECEIVED') {
        // 1. Produce finished goods
        await tx.product.update({
          where: { id: existing.productId },
          data: {
            onHandQty: { increment: existing.quantity },
            availableQty: { increment: existing.quantity }
          }
        });

        await tx.stockLedger.create({
          data: {
            productId: existing.productId,
            transactionType: 'MFG_PRODUCTION',
            quantity: existing.quantity,
            referenceId: existing.moNumber,
            description: `Finished goods production for MO ${existing.moNumber}`,
            userRefId: req.user.id
          }
        });

        await recalculateAIThreshold(tx, existing.productId);

        // 2. Consume raw materials
        if (existing.bom && existing.bom.items) {
          for (const bomItem of existing.bom.items) {
            const consumedQty = bomItem.quantity * existing.quantity;
            await tx.product.update({
              where: { id: bomItem.productId },
              data: {
                onHandQty: { decrement: consumedQty },
                availableQty: { decrement: consumedQty }
              }
            });

            await tx.stockLedger.create({
              data: {
                productId: bomItem.productId,
                transactionType: 'MFG_CONSUMPTION',
                quantity: -consumedQty,
                referenceId: existing.moNumber,
                description: `Material consumption for MO ${existing.moNumber}`,
                userRefId: req.user.id
              }
            });

            await recalculateAIThreshold(tx, bomItem.productId);
          }
        }
      }

      const updatedMo = await tx.manufacturingOrder.update({
        where: { id },
        data: {
          status: status || undefined,
          startDate: (status === 'IN_PROGRESS' && !existing.startDate) ? new Date() : undefined,
          endDate: ((status === 'COMPLETED' || status === 'PRODUCTS_RECEIVED') && !existing.endDate) ? new Date() : undefined,
        },
        include: { workOrders: true }
      });

      return updatedMo;
    });

    await logAudit(prisma, {
      tableName: 'ManufacturingOrder',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    if (req.io) {
      req.io.to('ADMIN').to('OWNER').to('MANUFACTURING').to('INVENTORY').emit('notification', {
        title: 'MO Status Updated',
        message: `Manufacturing Order ${updated.moNumber} is now ${updated.status}.`,
        type: 'info',
        timestamp: new Date()
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update MO error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/manufacturing-orders/orders/:id - ADMIN only
router.delete('/orders/:id', authorizeRoles('ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.manufacturingOrder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Manufacturing order not found.' });

    await prisma.manufacturingOrder.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'ManufacturingOrder',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Manufacturing order deleted successfully.' });
  } catch (error) {
    console.error('Delete MO error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
