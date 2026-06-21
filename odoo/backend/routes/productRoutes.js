const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

// GET /api/products/:id/prediction - Fetch AI inventory forecasting prediction
router.get('/:id/prediction', async (req, res) => {
  const { id } = req.params;
  try {
    const prediction = await prisma.inventoryPrediction.findFirst({
      where: { productId: id },
      orderBy: { createdAt: 'desc' }
    });

    if (!prediction) {
      return res.json({
        calculatedThreshold: 25.0,
        avgDailySales: 3.2,
        salesVelocity: 1.1,
        reorderFrequency: 14.0,
        seasonalDemand: 1.0,
        explanation: "Static calculation: Standard product dynamics used. AI modeling pending."
      });
    }

    const explanation = `AI safety threshold auto-recalculated to ${prediction.calculatedThreshold} units based on sales activity (avg daily sales: ${prediction.avgDailySales.toFixed(1)}) and sales velocity (${prediction.salesVelocity.toFixed(2)}x).`;

    res.json({
      ...prediction,
      explanation
    });
  } catch (error) {
    console.error('Fetch product prediction error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/products/:id - Available to all authenticated roles
router.get('/:id', async (req, res, next) => {
  // If id is not a UUID, let next route handle it
  if (req.params.id.length < 36) {
    return next();
  }
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (error) {
    console.error('Fetch product detail error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/products - Available to all authenticated roles
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const isFinished = req.query.isFinished; // optional filter
  const skip = (page - 1) * limit;

  try {
    const where = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ],
    };

    if (isFinished !== undefined) {
      where.isFinishedGoods = isFinished === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { sku: 'asc' },
      skip,
      take: limit,
    });

    const total = await prisma.product.count({ where });

    res.json({
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/products - ADMIN and OWNER only
router.post('/', authorizeRoles('ADMIN', 'OWNER'), async (req, res) => {
  const { name, sku, description, price, cost, onHandQty, thresholdQty, isFinishedGoods } = req.body;

  if (!name || !sku) {
    return res.status(400).json({ message: 'Name and SKU are required.' });
  }

  try {
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return res.status(400).json({ message: 'SKU already exists.' });
    }

    const finalOnHand = parseFloat(onHandQty) || 0;
    const finalThreshold = parseFloat(thresholdQty) || 20.0;

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        description,
        price: parseFloat(price) || 0.0,
        cost: parseFloat(cost) || 0.0,
        onHandQty: finalOnHand,
        reservedQty: 0,
        availableQty: finalOnHand,
        thresholdQty: finalThreshold,
        isFinishedGoods: isFinishedGoods === true,
      },
    });

    // Write audit log
    await logAudit(prisma, {
      tableName: 'Product',
      recordId: product.id,
      action: 'CREATE',
      newValue: product,
      userId: req.user.id,
    });

    // If initial stock was provided, write to Stock Ledger as adjustment
    if (finalOnHand > 0) {
      await prisma.stockLedger.create({
        data: {
          productId: product.id,
          transactionType: 'ADJUSTMENT_ADD',
          quantity: finalOnHand,
          description: 'Initial stock load upon product creation',
          userRefId: req.user.id,
        }
      });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/products/:id - ADMIN and OWNER only
router.put('/:id', authorizeRoles('ADMIN', 'OWNER'), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, cost, thresholdQty, isFinishedGoods } = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        cost: cost !== undefined ? parseFloat(cost) : undefined,
        thresholdQty: thresholdQty !== undefined ? parseFloat(thresholdQty) : undefined,
        isFinishedGoods: isFinishedGoods !== undefined ? (isFinishedGoods === true) : undefined,
      },
    });

    // Audit log
    await logAudit(prisma, {
      tableName: 'Product',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/products/:id - ADMIN and OWNER only
router.delete('/:id', authorizeRoles('ADMIN', 'OWNER'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await prisma.product.delete({ where: { id } });

    // Audit log
    await logAudit(prisma, {
      tableName: 'Product',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Internal server error. Note: The product might be referenced in BOMs or orders.' });
  }
});



module.exports = router;
