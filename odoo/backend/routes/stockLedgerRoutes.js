const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

// GET /api/stock-ledger - Fetch movements (accessible by ADMIN, OWNER, INVENTORY)
router.get('/', authorizeRoles('ADMIN', 'OWNER', 'INVENTORY'), async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const type = req.query.type || '';
  const skip = (page - 1) * limit;

  try {
    const where = {
      AND: []
    };

    if (search) {
      where.AND.push({
        product: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        }
      });
    }

    if (type) {
      where.AND.push({
        transactionType: type
      });
    }

    // If AND is empty, clean it up
    if (where.AND.length === 0) {
      delete where.AND;
    }

    const movements = await prisma.stockLedger.findMany({
      where,
      include: {
        product: {
          select: { name: true, sku: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.stockLedger.count({ where });

    res.json({
      data: movements,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch stock ledger error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/stock-ledger/adjust - Create custom adjustments (ADMIN, OWNER, INVENTORY)
router.post('/adjust', authorizeRoles('ADMIN', 'OWNER', 'INVENTORY'), async (req, res) => {
  const { productId, transactionType, quantity, description } = req.body;

  if (!productId || !transactionType || !quantity) {
    return res.status(400).json({ message: 'Product ID, Transaction Type, and Quantity are required.' });
  }

  if (!['ADJUSTMENT_ADD', 'ADJUSTMENT_SUB'].includes(transactionType)) {
    return res.status(400).json({ message: 'Transaction Type must be either ADJUSTMENT_ADD or ADJUSTMENT_SUB.' });
  }

  const qtyValue = parseFloat(quantity);
  if (isNaN(qtyValue) || qtyValue <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const adjustmentQty = transactionType === 'ADJUSTMENT_ADD' ? qtyValue : -qtyValue;

    // Run in Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Product quantity
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          onHandQty: { increment: adjustmentQty },
          availableQty: { increment: adjustmentQty }
        }
      });

      // 2. Create StockLedger log
      const ledgerEntry = await tx.stockLedger.create({
        data: {
          productId,
          transactionType,
          quantity: adjustmentQty,
          description: description || 'Manual inventory adjustment',
          userRefId: req.user.id
        },
        include: {
          product: { select: { name: true, sku: true } }
        }
      });

      return { updatedProduct, ledgerEntry };
    });

    // 3. Log Audit
    await logAudit(prisma, {
      tableName: 'StockLedger',
      recordId: result.ledgerEntry.id,
      action: 'CREATE',
      newValue: result.ledgerEntry,
      userId: req.user.id,
    });

    // Notify rooms via socket (if req.io is active)
    if (req.io) {
      req.io.to('INVENTORY').emit('stock_adjusted', result.ledgerEntry);
      req.io.to('ADMIN').emit('stock_adjusted', result.ledgerEntry);
      req.io.to('OWNER').emit('stock_adjusted', result.ledgerEntry);

      const directionText = transactionType === 'ADJUSTMENT_ADD' ? 'added' : 'removed';
      req.io.to('ADMIN').to('OWNER').to('INVENTORY').emit('notification', {
        title: 'Inventory Adjusted',
        message: `${Math.abs(qtyValue)} units of ${result.ledgerEntry.product.name} were manually ${directionText}.`,
        type: 'info',
        timestamp: new Date()
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create stock adjustment error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
