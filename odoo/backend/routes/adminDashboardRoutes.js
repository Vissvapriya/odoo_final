const express = require('express');
const prisma = require('../prismaClient');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, authorizeRoles('ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'), async (req, res) => {
  try {
    const role = req.user.role;
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Common query data: trend chart datasets (last 30 days)
    // We populate only the relevant trends based on role to save database performance.
    const getTrends = async () => {
      const trendsObj = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        trendsObj[dateStr] = {
          date: dateStr,
          sales: 0,
          purchases: 0,
          mfgCompleted: 0,
          stockMoved: 0,
        };
      }

      if (role === 'ADMIN' || role === 'OWNER' || role === 'SALES') {
        const salesGroup = await prisma.salesOrder.findMany({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: { notIn: ['CANCELLED', 'DRAFT'] }
          },
          select: { createdAt: true, totalAmount: true }
        });
        salesGroup.forEach(o => {
          const dateStr = o.createdAt.toISOString().split('T')[0];
          if (trendsObj[dateStr]) {
            trendsObj[dateStr].sales += o.totalAmount;
          }
        });
      }

      if (role === 'ADMIN' || role === 'OWNER' || role === 'PURCHASE') {
        const purchaseGroup = await prisma.purchaseOrder.findMany({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: { notIn: ['CANCELLED', 'DRAFT'] }
          },
          select: { createdAt: true, totalAmount: true }
        });
        purchaseGroup.forEach(o => {
          const dateStr = o.createdAt.toISOString().split('T')[0];
          if (trendsObj[dateStr]) {
            trendsObj[dateStr].purchases += o.totalAmount;
          }
        });
      }

      if (role === 'ADMIN' || role === 'OWNER' || role === 'MANUFACTURING') {
        const mfgGroup = await prisma.manufacturingOrder.findMany({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            status: 'COMPLETED'
          },
          select: { createdAt: true }
        });
        mfgGroup.forEach(o => {
          const dateStr = o.createdAt.toISOString().split('T')[0];
          if (trendsObj[dateStr]) {
            trendsObj[dateStr].mfgCompleted += 1;
          }
        });
      }

      if (role === 'ADMIN' || role === 'OWNER' || role === 'INVENTORY') {
        const stockMovements = await prisma.stockLedger.findMany({
          where: {
            createdAt: { gte: thirtyDaysAgo }
          },
          select: { createdAt: true, quantity: true }
        });
        stockMovements.forEach(m => {
          const dateStr = m.createdAt.toISOString().split('T')[0];
          if (trendsObj[dateStr]) {
            trendsObj[dateStr].stockMoved += Math.abs(m.quantity);
          }
        });
      }

      return Object.values(trendsObj).sort((a, b) => a.date.localeCompare(b.date));
    };

    const trends = await getTrends();

    // 1. ADMIN / OWNER Dashboard (Full Control)
    if (role === 'ADMIN' || role === 'OWNER') {
      const totalProducts = await prisma.product.count();
      const totalSalesOrders = await prisma.salesOrder.count();
      const totalPurchaseOrders = await prisma.purchaseOrder.count();
      const totalMfgOrders = await prisma.manufacturingOrder.count();
      const totalVendors = await prisma.vendor.count();

      const productsForVal = await prisma.product.findMany({
        select: { onHandQty: true, cost: true }
      });
      const totalInventoryValue = productsForVal.reduce((acc, p) => acc + (p.onHandQty * p.cost), 0);

      const pendingDeliveries = await prisma.salesOrder.count({
        where: { status: { in: ['CONFIRMED', 'PARTIAL_DELIVERY'] } }
      });

      const pendingProcurement = await prisma.purchaseOrder.count({
        where: { status: { in: ['CONFIRMED', 'PARTIAL_RECEIVED'] } }
      });

      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(today.getDate() - 5);
      const delayedMfgOrders = await prisma.manufacturingOrder.count({
        where: {
          status: { in: ['CONFIRMED', 'IN_PROGRESS'] },
          createdAt: { lt: fiveDaysAgo }
        }
      });

      const latestSales = await prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } }
      });

      const latestPurchase = await prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { name: true } } }
      });

      const latestMfg = await prisma.manufacturingOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true, sku: true } } }
      });

      const latestLogs = await prisma.auditLog.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      });

      return res.json({
        role,
        kpis: {
          totalProducts,
          totalSalesOrders,
          totalPurchaseOrders,
          totalMfgOrders,
          totalInventoryValue,
          totalVendors,
          pendingDeliveries,
          pendingProcurement,
          delayedMfgOrders,
        },
        latest: {
          sales: latestSales,
          purchases: latestPurchase,
          manufacturing: latestMfg,
          auditLogs: latestLogs,
        },
        trends,
      });
    }

    // 2. SALES User Dashboard
    if (role === 'SALES') {
      const totalSalesOrders = await prisma.salesOrder.count();
      const salesOrdersForRevenue = await prisma.salesOrder.findMany({
        where: { status: { notIn: ['CANCELLED', 'DRAFT'] } },
        select: { totalAmount: true }
      });
      const totalSalesRevenue = salesOrdersForRevenue.reduce((acc, o) => acc + o.totalAmount, 0);

      const pendingDeliveries = await prisma.salesOrder.count({
        where: { status: { in: ['CONFIRMED', 'PARTIAL_DELIVERY'] } }
      });

      const newCustomers = await prisma.customer.count();

      const latestSales = await prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } }
      });

      return res.json({
        role,
        kpis: {
          totalSalesOrders,
          totalSalesRevenue,
          pendingDeliveries,
          newCustomers,
        },
        latest: {
          sales: latestSales,
        },
        trends,
      });
    }

    // 3. PURCHASE User Dashboard
    if (role === 'PURCHASE') {
      const totalPurchaseOrders = await prisma.purchaseOrder.count();
      const purchaseOrdersForSpend = await prisma.purchaseOrder.findMany({
        where: { status: { notIn: ['CANCELLED', 'DRAFT'] } },
        select: { totalAmount: true }
      });
      const totalPurchaseSpend = purchaseOrdersForSpend.reduce((acc, o) => acc + o.totalAmount, 0);

      const pendingProcurement = await prisma.purchaseOrder.count({
        where: { status: { in: ['CONFIRMED', 'PARTIAL_RECEIVED'] } }
      });

      const totalVendors = await prisma.vendor.count();

      const latestPurchase = await prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { vendor: { select: { name: true } } }
      });

      return res.json({
        role,
        kpis: {
          totalPurchaseOrders,
          totalPurchaseSpend,
          pendingProcurement,
          totalVendors,
        },
        latest: {
          purchases: latestPurchase,
        },
        trends,
      });
    }

    // 4. MANUFACTURING User Dashboard
    if (role === 'MANUFACTURING') {
      const totalMfgOrders = await prisma.manufacturingOrder.count();
      const completedMfgOrders = await prisma.manufacturingOrder.count({
        where: { status: 'COMPLETED' }
      });
      const activeMfgOrders = await prisma.manufacturingOrder.count({
        where: { status: { in: ['CONFIRMED', 'IN_PROGRESS'] } }
      });
      const totalBoms = await prisma.bOM.count();

      const latestMfg = await prisma.manufacturingOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true, sku: true } } }
      });

      return res.json({
        role,
        kpis: {
          totalMfgOrders,
          completedMfgOrders,
          activeMfgOrders,
          totalBoms,
        },
        latest: {
          manufacturing: latestMfg,
        },
        trends,
      });
    }

    // 5. INVENTORY User Dashboard
    if (role === 'INVENTORY') {
      const totalProducts = await prisma.product.count();
      const productsForVal = await prisma.product.findMany({
        select: { onHandQty: true, cost: true }
      });
      const totalInventoryValue = productsForVal.reduce((acc, p) => acc + (p.onHandQty * p.cost), 0);

      const lowStockAlerts = await prisma.product.count({
        where: {
          availableQty: {
            lte: prisma.product.fields.thresholdQty
          }
        }
      });

      const totalStockMovements = await prisma.stockLedger.count();

      const latestStockMovements = await prisma.stockLedger.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, sku: true } }
        }
      });

      return res.json({
        role,
        kpis: {
          totalProducts,
          totalInventoryValue,
          lowStockAlerts,
          totalStockMovements,
        },
        latest: {
          stockMovements: latestStockMovements,
        },
        trends,
      });
    }

    res.status(400).json({ message: 'Dashboard is not configured for this user role.' });
  } catch (error) {
    console.error('Admin dashboard metrics error:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
