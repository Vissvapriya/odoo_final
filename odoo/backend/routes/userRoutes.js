const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Apply Admin restriction to all routes here
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN'));

// GET /api/users - List users with pagination and search
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
            { role: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.user.count({ where });

    res.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/users - Create user
router.post('/', async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ message: 'All fields (email, password, name, role) are required.' });
  }

  const validRoles = ['ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'];
  if (!validRoles.includes(role.toUpperCase())) {
    return res.status(400).json({ message: 'Invalid role assigned.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: role.toUpperCase(),
      },
    });

    // Audit Log
    const createdUserSafe = { id: user.id, email: user.email, name: user.name, role: user.role };
    await logAudit(prisma, {
      tableName: 'User',
      recordId: user.id,
      action: 'CREATE',
      newValue: createdUserSafe,
      userId: req.user.id,
    });

    // Notify clients via Socket.io in server.js
    if (req.io) {
      req.io.to('ADMIN').emit('notification', {
        title: 'New User Created',
        message: `${user.name} (${user.role}) has been added by Admin.`,
        type: 'info',
        timestamp: new Date()
      });
    }

    res.status(201).json(createdUserSafe);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { email, name, role, password } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const oldSafe = { id: existing.id, email: existing.email, name: existing.name, role: existing.role };

    const updateData = {};
    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (role) {
      const validRoles = ['ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'];
      if (!validRoles.includes(role.toUpperCase())) {
        return res.status(400).json({ message: 'Invalid role assigned.' });
      }
      updateData.role = role.toUpperCase();
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    const newSafe = { id: updated.id, email: updated.email, name: updated.name, role: updated.role };

    // Audit Log
    await logAudit(prisma, {
      tableName: 'User',
      recordId: id,
      action: 'UPDATE',
      oldValue: oldSafe,
      newValue: newSafe,
      userId: req.user.id,
    });

    res.json(newSafe);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ message: 'Self deletion is not allowed.' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const oldSafe = { id: existing.id, email: existing.email, name: existing.name, role: existing.role };

    await prisma.user.delete({ where: { id } });

    // Audit Log
    await logAudit(prisma, {
      tableName: 'User',
      recordId: id,
      action: 'DELETE',
      oldValue: oldSafe,
      userId: req.user.id,
    });

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
