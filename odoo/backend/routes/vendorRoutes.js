const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.use(authenticateToken);

// GET /api/vendors/ai-recommend - Recommend vendors by performance score
router.get('/ai-recommend', async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { finalScore: 'desc' },
      take: 3
    });

    if (vendors.length === 0) {
      return res.status(404).json({ message: 'No vendors found.' });
    }

    const recommended = vendors[0];
    const explanation = `AI recommendation: ${recommended.name} is recommended due to highest overall score (${(recommended.finalScore || 0).toFixed(0)}/100) with Price Score of ${(recommended.priceScore || 0).toFixed(0)}%, Delivery Score of ${(recommended.deliveryScore || 0).toFixed(0)}%, and Quality Score of ${(recommended.qualityScore || 0).toFixed(0)}%.`;

    res.json({
      recommendedVendor: recommended,
      explanation,
      allRecommendations: vendors.map(v => ({
        id: v.id,
        name: v.name,
        finalScore: v.finalScore,
        priceScore: v.priceScore,
        deliveryScore: v.deliveryScore,
        qualityScore: v.qualityScore,
        reliabilityScore: v.reliabilityScore,
        explanation: `${v.name} scored ${(v.finalScore || 0).toFixed(0)}% overall. Quality: ${(v.qualityScore || 0).toFixed(0)}%, Reliability: ${(v.reliabilityScore || 0).toFixed(0)}%.`
      }))
    });
  } catch (error) {
    console.error('AI Vendor Recommendation error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// GET /api/vendors - View allowed for everyone authenticated
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

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });

    const total = await prisma.vendor.count({ where });

    res.json({
      data: vendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Fetch vendors error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// POST /api/vendors - ADMIN only
router.post('/', authorizeRoles('ADMIN'), async (req, res) => {
  const { name, email, phone, address, priceScore, deliveryScore, qualityScore, reliabilityScore } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and Email are required.' });
  }

  try {
    const pScore = parseFloat(priceScore) || 0;
    const dScore = parseFloat(deliveryScore) || 0;
    const qScore = parseFloat(qualityScore) || 0;
    const rScore = parseFloat(reliabilityScore) || 0;
    const finalScore = (pScore * 0.4) + (dScore * 0.3) + (qScore * 0.2) + (rScore * 0.1);

    const vendor = await prisma.vendor.create({
      data: {
        name,
        email,
        phone,
        address,
        priceScore: pScore,
        deliveryScore: dScore,
        qualityScore: qScore,
        reliabilityScore: rScore,
        finalScore,
      },
    });

    await logAudit(prisma, {
      tableName: 'Vendor',
      recordId: vendor.id,
      action: 'CREATE',
      newValue: vendor,
      userId: req.user.id,
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// PUT /api/vendors/:id - ADMIN only
router.put('/:id', authorizeRoles('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, priceScore, deliveryScore, qualityScore, reliabilityScore } = req.body;

  try {
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Vendor not found.' });
    }

    const pScore = priceScore !== undefined ? parseFloat(priceScore) : existing.priceScore;
    const dScore = deliveryScore !== undefined ? parseFloat(deliveryScore) : existing.deliveryScore;
    const qScore = qualityScore !== undefined ? parseFloat(qualityScore) : existing.qualityScore;
    const rScore = reliabilityScore !== undefined ? parseFloat(reliabilityScore) : existing.reliabilityScore;
    const finalScore = (pScore * 0.4) + (dScore * 0.3) + (qScore * 0.2) + (rScore * 0.1);

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        name: name || undefined,
        email: email || undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        priceScore: pScore,
        deliveryScore: dScore,
        qualityScore: qScore,
        reliabilityScore: rScore,
        finalScore,
      },
    });

    await logAudit(prisma, {
      tableName: 'Vendor',
      recordId: id,
      action: 'UPDATE',
      oldValue: existing,
      newValue: updated,
      userId: req.user.id,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// DELETE /api/vendors/:id - ADMIN only
router.delete('/:id', authorizeRoles('ADMIN'), async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Vendor not found.' });
    }

    await prisma.vendor.delete({ where: { id } });

    await logAudit(prisma, {
      tableName: 'Vendor',
      recordId: id,
      action: 'DELETE',
      oldValue: existing,
      userId: req.user.id,
    });

    res.json({ message: 'Vendor deleted successfully.' });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
