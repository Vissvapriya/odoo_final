const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper to chunk arrays
function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

// Random range helper
const randomRange = (min, max) => Math.random() * (max - min) + min;
const randomIntRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  console.log('Starting seed process...');
  const startTime = Date.now();

  // Clear existing data
  console.log('Cleaning existing data...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog", "StockLedger", "WorkOrder", "ManufacturingOrder", "Operation", "WorkCenter", "BOMItem", "BOM", "PurchaseOrderItem", "PurchaseOrder", "SalesOrderItem", "SalesOrder", "Customer", "Vendor", "Product", "User", "InventoryPrediction", "VendorRecommendation" CASCADE;`);
  console.log('Database cleared.');

  // 1. Seed Users (200)
  console.log('Seeding 200 Users...');
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const roles = ['ADMIN', 'OWNER', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'];
  const usersData = [];

  // Seed fixed login users first
  usersData.push({
    email: 'admin@erp.com',
    passwordHash: defaultPasswordHash,
    name: 'System Admin',
    role: 'ADMIN',
  });
  usersData.push({
    email: 'owner@erp.com',
    passwordHash: defaultPasswordHash,
    name: 'Business Owner',
    role: 'OWNER',
  });
  usersData.push({
    email: 'sales@erp.com',
    passwordHash: defaultPasswordHash,
    name: 'Sales Manager',
    role: 'SALES',
  });
  usersData.push({
    email: 'purchase@erp.com',
    passwordHash: defaultPasswordHash,
    name: 'Purchase Officer',
    role: 'PURCHASE',
  });
  usersData.push({
    email: 'mfg@erp.com',
    passwordHash: defaultPasswordHash,
    name: 'Manufacturing Lead',
    role: 'MANUFACTURING',
  });
  usersData.push({
    email: 'inventory@erp.com',
    passwordHash: defaultPasswordHash,
    name: 'Inventory Manager',
    role: 'INVENTORY',
  });

  // Remaining users
  const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Lisa', 'James', 'Mary', 'William', 'Patricia'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'];
  
  for (let i = 7; i <= 200; i++) {
    const role = pickRandom(roles);
    const fname = pickRandom(firstNames);
    const lname = pickRandom(lastNames);
    usersData.push({
      email: `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@erp.com`,
      passwordHash: defaultPasswordHash,
      name: `${fname} ${lname}`,
      role: role,
    });
  }
  await prisma.user.createMany({ data: usersData });
  const users = await prisma.user.findMany();
  console.log(`Seeded ${users.length} Users.`);

  // 2. Seed Vendors (500)
  console.log('Seeding 500 Vendors...');
  const vendorsData = [];
  const vendorTypes = ['Logistics', 'Supplies Corp', 'Industries', 'Materials Ltd', 'Tech Components', 'Global Logistics'];
  for (let i = 1; i <= 500; i++) {
    const name = `Vendor ${String(i).padStart(4, '0')} ${pickRandom(vendorTypes)}`;
    const priceScore = randomRange(60, 100);
    const deliveryScore = randomRange(60, 100);
    const qualityScore = randomRange(70, 100);
    const reliabilityScore = randomRange(65, 100);
    const finalScore = (priceScore * 0.4) + (deliveryScore * 0.3) + (qualityScore * 0.2) + (reliabilityScore * 0.1);

    vendorsData.push({
      name,
      email: `contact@vendor${i}.com`,
      phone: `+1-555-${String(randomIntRange(100, 999))}-${String(randomIntRange(1000, 9999))}`,
      address: `${randomIntRange(10, 999)} Industrial Way, Suite ${randomIntRange(1, 50)}`,
      priceScore,
      deliveryScore,
      qualityScore,
      reliabilityScore,
      finalScore,
    });
  }
  await prisma.vendor.createMany({ data: vendorsData });
  const vendors = await prisma.vendor.findMany();
  console.log(`Seeded ${vendors.length} Vendors.`);

  // 3. Seed Customers (1000)
  console.log('Seeding 1000 Customers...');
  const customersData = [];
  const clientTypes = ['Retail', 'Holdings', 'Group', 'Enterprises', 'Direct', 'Inc', 'Solutions'];
  for (let i = 1; i <= 1000; i++) {
    const name = `Customer ${String(i).padStart(4, '0')} ${pickRandom(clientTypes)}`;
    customersData.push({
      name,
      email: `info@customer${i}.com`,
      phone: `+1-555-${String(randomIntRange(100, 999))}-${String(randomIntRange(1000, 9999))}`,
      address: `${randomIntRange(100, 9999)} Market St, Apt ${randomIntRange(1, 100)}`,
    });
  }
  await prisma.customer.createMany({ data: customersData });
  const customers = await prisma.customer.findMany();
  console.log(`Seeded ${customers.length} Customers.`);

  // 4. Seed Products (1000)
  console.log('Seeding 1000 Products...');
  const productsData = [];
  // 1-400 finished goods, 401-1000 raw materials
  for (let i = 1; i <= 1000; i++) {
    const isFinished = i <= 400;
    const price = isFinished ? randomRange(100, 1000) : 0;
    const cost = isFinished ? price * randomRange(0.4, 0.6) : randomRange(5, 50);
    const sku = isFinished ? `FG-${String(i).padStart(4, '0')}` : `RM-${String(i - 400).padStart(4, '0')}`;
    const name = isFinished ? `Finished Goods Product ${String(i).padStart(4, '0')}` : `Raw Material Component ${String(i - 400).padStart(4, '0')}`;

    // Seed stock levels:
    // Raw materials have more stock, finished goods have less
    const onHandQty = isFinished ? randomIntRange(5, 100) : randomIntRange(200, 1000);
    const reservedQty = isFinished ? randomIntRange(0, 10) : randomIntRange(0, 150);
    const availableQty = onHandQty - reservedQty;

    productsData.push({
      sku,
      name,
      description: `Premium quality ${isFinished ? 'finished goods' : 'raw material component'} used in ERP operations.`,
      price,
      cost,
      onHandQty,
      reservedQty,
      availableQty,
      thresholdQty: isFinished ? randomIntRange(10, 30) : randomIntRange(50, 150),
      isFinishedGoods: isFinished,
    });
  }
  await prisma.product.createMany({ data: productsData });
  const products = await prisma.product.findMany();
  const finishedGoods = products.filter(p => p.isFinishedGoods);
  const rawMaterials = products.filter(p => !p.isFinishedGoods);
  console.log(`Seeded ${products.length} Products (${finishedGoods.length} Finished, ${rawMaterials.length} Raw).`);

  // 5. Seed BOMs (500)
  console.log('Seeding 500 BOMs...');
  const bomsData = [];
  // Generate BOMs for first 500 products (which includes all finished goods + some other)
  // Let's create BOMs for finished goods
  const bomsToCreate = finishedGoods.slice(0, 400); // 400 finished goods
  const extraBoms = rawMaterials.slice(0, 100); // another 100 items can have assembly boms
  const targetProductsForBom = [...bomsToCreate, ...extraBoms];

  for (let i = 0; i < targetProductsForBom.length; i++) {
    bomsData.push({
      id: `bom-uuid-${i}`,
      productId: targetProductsForBom[i].id,
      name: `BOM for ${targetProductsForBom[i].name}`,
      quantity: 1.0,
    });
  }
  await prisma.bOM.createMany({ data: bomsData });
  const boms = await prisma.bOM.findMany();

  // Create BOMItems (raw materials required for BOM)
  const bomItemsData = [];
  for (const bom of boms) {
    // Pick 3-5 random raw materials
    const materialsCount = randomIntRange(3, 5);
    const shuffledMaterials = [...rawMaterials].sort(() => 0.5 - Math.random());
    for (let j = 0; j < materialsCount; j++) {
      bomItemsData.push({
        bomId: bom.id,
        productId: shuffledMaterials[j].id,
        quantity: randomIntRange(2, 10),
      });
    }
  }
  await prisma.bOMItem.createMany({ data: bomItemsData });
  console.log(`Seeded ${boms.length} BOMs and BOM Items.`);

  // 6. Seed Work Centers & Operations
  console.log('Seeding Work Centers & Operations...');
  const workCentersData = [
    { name: 'Assembly Line A', code: 'WC-ASY-A', capacity: 2.0, hourlyCost: 50.0 },
    { name: 'Assembly Line B', code: 'WC-ASY-B', capacity: 2.0, hourlyCost: 50.0 },
    { name: 'Painting Station', code: 'WC-PNT', capacity: 1.0, hourlyCost: 65.0 },
    { name: 'Packaging Station', code: 'WC-PKG', capacity: 3.0, hourlyCost: 30.0 },
    { name: 'Quality Inspection', code: 'WC-QC', capacity: 2.0, hourlyCost: 45.0 },
  ];
  await prisma.workCenter.createMany({ data: workCentersData });
  const workCenters = await prisma.workCenter.findMany();

  const operationsData = [];
  const operationNames = ['Cutting & Shaping', 'Primary Assembly', 'Secondary Polish', 'Paint Coating', 'Finishing & Pack', 'Final Inspection'];
  for (const wc of workCenters) {
    const opsCount = randomIntRange(2, 3);
    for (let seq = 1; seq <= opsCount; seq++) {
      operationsData.push({
        name: `${pickRandom(operationNames)} (${wc.code})`,
        workCenterId: wc.id,
        setupTime: randomIntRange(10, 30),
        runTime: randomIntRange(15, 60),
        sequence: seq,
      });
    }
  }
  await prisma.operation.createMany({ data: operationsData });
  const operations = await prisma.operation.findMany();
  console.log('Seeded Work Centers and Operations.');

  // 7. Seed Sales Orders (5000) & Items (10000)
  console.log('Seeding 5000 Sales Orders & 10000 Sales Order Items...');
  const salesOrdersData = [];
  const salesItemsData = [];
  const salesStatuses = ['DRAFT', 'CONFIRMED', 'PARTIAL_DELIVERY', 'DELIVERED', 'CANCELLED'];

  for (let i = 1; i <= 5000; i++) {
    const customer = pickRandom(customers);
    const status = pickRandom(salesStatuses);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - randomIntRange(0, 365));

    const salesOrderId = `so-uuid-${i}`;
    salesOrdersData.push({
      id: salesOrderId,
      orderNumber: `SO-${String(i).padStart(6, '0')}`,
      customerId: customer.id,
      status,
      totalAmount: 0.0, // calculated later
      createdAt,
      updatedAt: createdAt,
    });

    // Add 1-3 items per order to hit ~10000 items
    const itemsCount = i % 2 === 0 ? 2 : (i % 3 === 0 ? 3 : 1);
    for (let j = 1; j <= itemsCount; j++) {
      const product = pickRandom(finishedGoods);
      const quantity = randomIntRange(1, 10);
      const price = product.price;

      salesItemsData.push({
        id: `so-item-uuid-${i}-${j}`,
        salesOrderId,
        productId: product.id,
        quantity,
        price,
        deliveredQty: status === 'DELIVERED' ? quantity : (status === 'PARTIAL_DELIVERY' ? randomIntRange(1, quantity - 1) : 0),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  // Calculate total amounts on Sales Orders
  const orderTotals = {};
  for (const item of salesItemsData) {
    orderTotals[item.salesOrderId] = (orderTotals[item.salesOrderId] || 0) + (item.quantity * item.price);
  }
  for (const order of salesOrdersData) {
    order.totalAmount = orderTotals[order.id] || 0;
  }

  // Chunk inserts for performance and parameter safety
  const chunkedSOs = chunkArray(salesOrdersData, 1000);
  for (const chunk of chunkedSOs) {
    await prisma.salesOrder.createMany({ data: chunk });
  }

  const chunkedSOItems = chunkArray(salesItemsData, 2000);
  for (const chunk of chunkedSOItems) {
    await prisma.salesOrderItem.createMany({ data: chunk });
  }
  console.log(`Seeded 5000 Sales Orders and ${salesItemsData.length} Sales Order Items.`);

  // 8. Seed Purchase Orders (3000) & Items (8000)
  console.log('Seeding 3000 Purchase Orders & 8000 Purchase Order Items...');
  const purchaseOrdersData = [];
  const purchaseItemsData = [];
  const purchaseStatuses = ['DRAFT', 'CONFIRMED', 'PARTIAL_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'];

  for (let i = 1; i <= 3000; i++) {
    const vendor = pickRandom(vendors);
    const status = pickRandom(purchaseStatuses);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - randomIntRange(0, 365));

    const purchaseOrderId = `po-uuid-${i}`;
    purchaseOrdersData.push({
      id: purchaseOrderId,
      orderNumber: `PO-${String(i).padStart(6, '0')}`,
      vendorId: vendor.id,
      status,
      totalAmount: 0.0, // calculated later
      createdAt,
      updatedAt: createdAt,
    });

    // Add 2-3 items per order to get ~8000 items
    const itemsCount = i % 3 === 0 ? 3 : 2;
    for (let j = 1; j <= itemsCount; j++) {
      const product = pickRandom(rawMaterials);
      const quantity = randomIntRange(10, 100);
      const cost = product.cost;

      purchaseItemsData.push({
        id: `po-item-uuid-${i}-${j}`,
        purchaseOrderId,
        productId: product.id,
        quantity,
        cost,
        receivedQty: status === 'FULLY_RECEIVED' ? quantity : (status === 'PARTIAL_RECEIVED' ? randomIntRange(5, quantity - 5) : 0),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  // Calculate totals
  const poTotals = {};
  for (const item of purchaseItemsData) {
    poTotals[item.purchaseOrderId] = (poTotals[item.purchaseOrderId] || 0) + (item.quantity * item.cost);
  }
  for (const order of purchaseOrdersData) {
    order.totalAmount = poTotals[order.id] || 0;
  }

  const chunkedPOs = chunkArray(purchaseOrdersData, 1000);
  for (const chunk of chunkedPOs) {
    await prisma.purchaseOrder.createMany({ data: chunk });
  }

  const chunkedPOItems = chunkArray(purchaseItemsData, 2000);
  for (const chunk of chunkedPOItems) {
    await prisma.purchaseOrderItem.createMany({ data: chunk });
  }
  console.log(`Seeded 3000 Purchase Orders and ${purchaseItemsData.length} Purchase Order Items.`);

  // 9. Seed Manufacturing Orders (3000) & Work Orders (10000)
  console.log('Seeding 3000 Manufacturing Orders...');
  const mfgOrdersData = [];
  const workOrdersData = [];
  const mfgStatuses = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  for (let i = 1; i <= 3000; i++) {
    const bom = pickRandom(boms);
    const status = pickRandom(mfgStatuses);
    const quantity = randomIntRange(10, 50);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - randomIntRange(0, 365));

    const moId = `mo-uuid-${i}`;
    const moNumber = `MO-${String(i).padStart(6, '0')}`;
    mfgOrdersData.push({
      id: moId,
      moNumber,
      productId: bom.productId,
      quantity,
      status,
      bomId: bom.id,
      startDate: status !== 'DRAFT' ? createdAt : null,
      endDate: status === 'COMPLETED' ? new Date(createdAt.getTime() + 86400000) : null,
      createdAt,
      updatedAt: createdAt,
    });

    // Auto-generate Work Orders based on operations
    // We will assign 3-4 work orders to each MO to reach ~10000
    const wcOps = operations.slice(0, 3); // pick first 3 operations
    for (let seq = 1; seq <= wcOps.length; seq++) {
      const op = wcOps[seq - 1];
      const woStatus = status === 'COMPLETED' ? 'COMPLETED' : (status === 'IN_PROGRESS' && seq === 1 ? 'IN_PROGRESS' : 'PENDING');
      workOrdersData.push({
        moNumber,
        manufacturingOrderId: moId,
        operationId: op.id,
        name: `Perform ${op.name}`,
        workCenterId: op.workCenterId,
        sequence: seq,
        status: woStatus,
        duration: woStatus === 'COMPLETED' ? op.runTime + op.setupTime + randomIntRange(-5, 10) : 0,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  const chunkedMOs = chunkArray(mfgOrdersData, 1000);
  for (const chunk of chunkedMOs) {
    await prisma.manufacturingOrder.createMany({ data: chunk });
  }

  const chunkedWOs = chunkArray(workOrdersData, 2000);
  for (const chunk of chunkedWOs) {
    await prisma.workOrder.createMany({ data: chunk });
  }
  console.log(`Seeded 3000 Manufacturing Orders and ${workOrdersData.length} Work Orders.`);

  // 10. Seed Stock Ledger (50000+)
  console.log('Seeding 50000+ Stock Ledger Records...');
  const ledgerData = [];
  const transTypes = ['SALES_DELIVERY', 'PURCHASE_RECEIPT', 'MFG_CONSUMPTION', 'MFG_PRODUCTION', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB'];
  
  // To reach 50,000+ stock ledger records efficiently, we can generate a base loop of transactions
  // that maps logically to our created orders.
  // 1. PO receipts (for completed or partial POs) -> ~4000 records
  const activePOItems = purchaseItemsData.filter(item => item.receivedQty > 0);
  for (const item of activePOItems) {
    ledgerData.push({
      productId: item.productId,
      transactionType: 'PURCHASE_RECEIPT',
      quantity: item.receivedQty,
      referenceId: item.purchaseOrderId,
      description: `Received goods for PO`,
      createdAt: item.createdAt,
    });
  }

  // 2. SO deliveries (for delivered/partial sales orders) -> ~6000 records
  const activeSOItems = salesItemsData.filter(item => item.deliveredQty > 0);
  for (const item of activeSOItems) {
    ledgerData.push({
      productId: item.productId,
      transactionType: 'SALES_DELIVERY',
      quantity: -item.deliveredQty,
      referenceId: item.salesOrderId,
      description: `Delivered goods for SO`,
      createdAt: item.createdAt,
    });
  }

  // 3. Manufacturing consumption and production (for completed manufacturing orders) -> ~12000 records
  const completedMOs = mfgOrdersData.filter(mo => mo.status === 'COMPLETED');
  const bomIdToItems = {};
  const bomItems = await prisma.bOMItem.findMany();
  for (const item of bomItems) {
    if (!bomIdToItems[item.bomId]) bomIdToItems[item.bomId] = [];
    bomIdToItems[item.bomId].push(item);
  }

  for (const mo of completedMOs) {
    // Production ledger record
    ledgerData.push({
      productId: mo.productId,
      transactionType: 'MFG_PRODUCTION',
      quantity: mo.quantity,
      referenceId: mo.id,
      description: `Finished goods manufactured from MO: ${mo.moNumber}`,
      createdAt: mo.createdAt,
    });

    // Consumption records for its BOM items
    const components = bomIdToItems[mo.bomId] || [];
    for (const comp of components) {
      ledgerData.push({
        productId: comp.productId,
        transactionType: 'MFG_CONSUMPTION',
        quantity: -(comp.quantity * mo.quantity),
        referenceId: mo.id,
        description: `Consumed for MO production: ${mo.moNumber}`,
        createdAt: mo.createdAt,
      });
    }
  }

  // 4. Fill in remaining to reach 50,000+ records via periodic warehouse adjustments
  const remainingLedgerCount = 50000 - ledgerData.length;
  console.log(`PO/SO/MFG generated ${ledgerData.length} ledger entries. Generating ${remainingLedgerCount} random adjustments...`);
  
  for (let i = 0; i < remainingLedgerCount; i++) {
    const product = pickRandom(products);
    const isAdd = Math.random() > 0.4; // 60% additions, 40% subtractions
    const qty = randomIntRange(1, 20);
    const user = pickRandom(users);
    const date = new Date();
    date.setDate(date.getDate() - randomIntRange(0, 365));

    ledgerData.push({
      productId: product.id,
      transactionType: isAdd ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB',
      quantity: isAdd ? qty : -qty,
      referenceId: `ADJ-${String(i).padStart(6, '0')}`,
      description: isAdd ? 'Stock adjustment - cycle count increase' : 'Stock adjustment - write-off/damage count decrease',
      userRefId: user.id,
      createdAt: date,
    });
  }

  const chunkedLedgers = chunkArray(ledgerData, 5000);
  for (const chunk of chunkedLedgers) {
    await prisma.stockLedger.createMany({ data: chunk });
  }
  console.log(`Seeded ${ledgerData.length} Stock Ledger entries.`);

  // 11. Seed Audit Logs (100000+)
  console.log('Seeding 100000+ Audit Logs...');
  const auditLogsData = [];
  const auditActions = ['CREATE', 'UPDATE', 'DELETE'];
  const auditTables = ['Product', 'SalesOrder', 'PurchaseOrder', 'User', 'Vendor', 'BOM', 'ManufacturingOrder'];

  for (let i = 1; i <= 100000; i++) {
    const action = pickRandom(auditActions);
    const tableName = pickRandom(auditTables);
    const user = pickRandom(users);
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - randomIntRange(0, 365));

    const recordId = `record-uuid-${randomIntRange(1000, 99999)}`;
    let oldValue = null;
    let newValue = null;

    if (action === 'CREATE') {
      newValue = { id: recordId, name: `Record ${i}`, status: 'NEW', createdBy: user.name };
    } else if (action === 'UPDATE') {
      oldValue = { id: recordId, status: 'PENDING', value: 100 };
      newValue = { id: recordId, status: 'COMPLETED', value: 120, updatedBy: user.name };
    } else {
      oldValue = { id: recordId, name: `Deleted Record ${i}` };
    }

    auditLogsData.push({
      tableName,
      recordId,
      action,
      oldValue,
      newValue,
      userId: user.id,
      timestamp,
    });
  }

  const chunkedAudits = chunkArray(auditLogsData, 5000);
  let chunkIdx = 1;
  for (const chunk of chunkedAudits) {
    if (chunkIdx % 5 === 0) {
      console.log(`Inserting Audit Logs chunk ${chunkIdx}/${chunkedAudits.length}...`);
    }
    await prisma.auditLog.createMany({ data: chunk });
    chunkIdx++;
  }
  console.log(`Seeded ${auditLogsData.length} Audit Logs.`);

  // 12. Seed Predictions & Vendor Recommendations (a few hundreds to populate dashboards)
  console.log('Seeding Predictions and Recommendations...');
  const predictionData = [];
  for (const prod of products) {
    predictionData.push({
      productId: prod.id,
      calculatedThreshold: Math.round(prod.thresholdQty * randomRange(0.8, 1.5)),
      avgDailySales: randomRange(1, 10),
      salesVelocity: randomRange(0.5, 2.0),
      reorderFrequency: randomRange(5, 30),
      seasonalDemand: randomRange(0.8, 1.4),
      predictionDate: new Date(),
    });
  }
  await prisma.inventoryPrediction.createMany({ data: predictionData });

  // Recommendations for completed/confirmed POs
  const recommendationData = [];
  const samplePOs = purchaseOrdersData.slice(0, 500);
  for (const po of samplePOs) {
    const items = purchaseItemsData.filter(item => item.purchaseOrderId === po.id);
    for (const item of items) {
      const recVendor = pickRandom(vendors);
      recommendationData.push({
        purchaseOrderId: po.id,
        productId: item.productId,
        recommendedVendorId: recVendor.id,
        score: randomRange(75, 98),
        explanation: `${recVendor.name} recommended: lowest average cost ($${item.cost.toFixed(2)}) and high delivery score (${recVendor.deliveryScore.toFixed(0)}%).`,
      });
    }
  }
  await prisma.vendorRecommendation.createMany({ data: recommendationData });
  console.log('Seeded Predictions and Vendor Recommendations.');

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`SEEDING COMPLETED SUCCESSFULLY in ${totalTime} seconds!`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
