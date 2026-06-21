const prisma = require('../prismaClient');

/**
 * Automatically recalculate AI Threshold for a product based on historical stock ledger entries.
 * Formula: thresholdQty = 15 + (salesVolume * 0.2) - (purchaseVolume * 0.05)
 * Capped between 5 and 100.
 */
async function recalculateAIThreshold(tx, productId) {
  try {
    // Fetch last 10 movements in StockLedger for this product
    const movements = await tx.stockLedger.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    let salesVol = 0;
    let purchaseVol = 0;

    for (const m of movements) {
      if (m.transactionType === 'SALES_DELIVERY' || m.transactionType === 'ADJUSTMENT_SUB' || m.transactionType === 'MFG_CONSUMPTION') {
        salesVol += Math.abs(m.quantity);
      } else if (m.transactionType === 'PURCHASE_RECEIPT' || m.transactionType === 'ADJUSTMENT_ADD' || m.transactionType === 'MFG_PRODUCTION') {
        purchaseVol += Math.abs(m.quantity);
      }
    }

    // Calculate new threshold based on volume formula
    const calculated = 15 + (salesVol * 0.2) - (purchaseVol * 0.05);
    const newThreshold = Math.max(5, Math.min(100, Math.round(calculated)));

    // Update Product's thresholdQty
    await tx.product.update({
      where: { id: productId },
      data: { thresholdQty: newThreshold }
    });

    // Create a new InventoryPrediction record
    const avgDailySales = salesVol / 30;
    const salesVelocity = salesVol / (purchaseVol || 1);

    await tx.inventoryPrediction.create({
      data: {
        productId,
        calculatedThreshold: newThreshold,
        avgDailySales,
        salesVelocity,
        reorderFrequency: 14,
        seasonalDemand: 1.1
      }
    });

    console.log(`[AI THRESHOLD] Product ${productId} updated threshold to ${newThreshold}`);
  } catch (error) {
    console.error(`Failed to recalculate AI Threshold for product ${productId}:`, error);
  }
}

module.exports = { recalculateAIThreshold };
