const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Both ADMIN and OWNER roles can view audit logs, but let's restrict to them.
// Note: matrix says Admin: Full, Owner: View, Others: No
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'OWNER'));

// GET /api/audit-logs - Fetch logs with query params for pagination and ID filtering
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const skip = (page - 1) * limit;

  const { tableName, recordId, userId, action, search } = req.query;

  try {
    const where = {};

    if (tableName) {
      where.tableName = tableName;
    }
    if (recordId) {
      where.recordId = recordId;
    }
    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = action.toUpperCase();
    }

    if (search) {
      where.OR = [
        { tableName: { contains: search, mode: 'insensitive' } },
        { recordId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.auditLog.count({ where });

    res.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
