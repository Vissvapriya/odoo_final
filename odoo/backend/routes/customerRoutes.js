const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

// GET /api/customers - View allowed for everyone authenticated
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
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });

    const total = await prisma.customer.count({ where });

    res.json({
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/customers - ADMIN and SALES roles only
router.post('/', authorizeRoles('ADMIN', 'SALES'), async (req, res) => {
  const { name, email, phone, address } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and Email are required.' });
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
      },
    });

    await logAudit(prisma, {
      tableName: 'Customer',
      recordId: customer.id,
      action: 'CREATE',
      newValue: customer,
      userId: req.user.id,
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/customers/:id - ADMIN and SALES roles only
router.put('/:id', authorizeRoles('ADMIN', 'SALES'), async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address } = req.body;

  try {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name || undefined,
        email: email || undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
      },
    });

    await logAudit(prisma, {
      tableName: 'Customer',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/customers/:id - ADMIN and SALES roles only
router.delete('/:id', authorizeRoles('ADMIN', 'SALES'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Customer not found.' });
    }

    await prisma.customer.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'Customer',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
