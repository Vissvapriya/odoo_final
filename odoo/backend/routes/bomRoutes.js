const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

// GET /api/boms - View allowed for everyone authenticated
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const skip = (page - 1) * limit;

  try {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { product: { name: { contains: search, mode: 'insensitive' } } },
            { product: { sku: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const boms = await prisma.bOM.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });

    const total = await prisma.bOM.count({ where });

    res.json({
      data: boms,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch BOMs error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/boms/:id - Fetch individual BOM with items
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const bom = await prisma.bOM.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true, price: true, cost: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, cost: true, onHandQty: true, availableQty: true } }
          }
        }
      }
    });

    if (!bom) {
      return res.status(404).json({ message: 'BOM not found.' });
    }

    res.json(bom);
  } catch (error) {
    console.error('Get BOM details error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/boms - Create a BOM with nested items. ADMIN and MANUFACTURING role only.
router.post('/', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { name, productId, quantity, items } = req.body;

  if (!name || !productId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'BOM name, finished product ID, and at least one raw material item are required.' });
  }

  try {
    // Verify finished product exists
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) {
      return res.status(400).json({ message: 'Finished product not found.' });
    }

    // Create BOM and its BOMItems in a database transaction
    const bom = await prisma.$transaction(async (tx) => {
      const createdBom = await tx.bOM.create({
        data: {
          name,
          productId,
          quantity: parseFloat(quantity) || 1.0,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: parseFloat(item.quantity) || 1.0
            }))
          }
        },
        include: {
          items: true
        }
      });
      return createdBom;
    });

    await logAudit(prisma, {
      tableName: 'BOM',
      recordId: bom.id,
      action: 'CREATE',
      newValue: bom,
      userId: req.user.id,
    });

    res.status(201).json(bom);
  } catch (error) {
    console.error('Create BOM error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/boms/:id - Update BOM and its items. ADMIN and MANUFACTURING role only.
router.put('/:id', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { id } = req.params;
  const { name, productId, quantity, items } = req.body;

  try {
    const existing = await prisma.bOM.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existing) {
      return res.status(404).json({ message: 'BOM not found.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If items are provided, delete existing ones first and replace them
      if (items && Array.isArray(items)) {
        await tx.bOMItem.deleteMany({ where: { bomId: id } });
      }

      const updatedBom = await tx.bOM.update({
        where: { id },
        data: {
          name: name || undefined,
          productId: productId || undefined,
          quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
          items: (items && Array.isArray(items)) ? {
            create: items.map(item => ({
              productId: item.productId,
              quantity: parseFloat(item.quantity) || 1.0
            }))
          } : undefined
        },
        include: {
          items: true
        }
      });

      return updatedBom;
    });

    await logAudit(prisma, {
      tableName: 'BOM',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update BOM error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/boms/:id - ADMIN and MANUFACTURING role only.
router.delete('/:id', authorizeRoles('ADMIN', 'MANUFACTURING'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.bOM.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'BOM not found.' });
    }

    await prisma.bOM.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'BOM',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'BOM deleted successfully.' });
  } catch (error) {
    console.error('Delete BOM error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
