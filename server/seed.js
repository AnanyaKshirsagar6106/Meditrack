const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, queryOne, execute } = require('./database');

async function seed() {
  await getDb();
  const existing = queryOne('SELECT COUNT(*) as c FROM users');
  if (existing && existing.c > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }
  console.log('Seeding MediTrack database...\n');

  function ins(table, data) {
    const cols = Object.keys(data).join(',');
    const vals = Object.keys(data).map(() => '?').join(',');
    execute(`INSERT INTO ${table}(${cols}) VALUES(${vals})`, Object.values(data));
  }

  // Users
  const ids = { admin: uuidv4(), mgr: uuidv4(), staff: uuidv4(), doc: uuidv4() };
  ins('users', { id: ids.admin, email: 'admin@meditrack.local', password: bcrypt.hashSync('MediTrack@2024', 10), name: 'Admin User', role: 'ADMIN' });
  ins('users', { id: ids.mgr, email: 'manager@meditrack.local', password: bcrypt.hashSync('manager123', 10), name: 'Inventory Manager', role: 'MANAGER' });
  ins('users', { id: ids.staff, email: 'staff@meditrack.local', password: bcrypt.hashSync('staff123', 10), name: 'Store Staff', role: 'STAFF' });
  ins('users', { id: ids.doc, email: 'doctor@meditrack.local', password: bcrypt.hashSync('doctor123', 10), name: 'Dr. Sharma', role: 'DOCTOR' });
  console.log('  Users done');

  // Categories
  const cats = { c1: uuidv4(), c2: uuidv4(), c3: uuidv4(), c4: uuidv4(), c5: uuidv4() };
  ins('categories', { id: cats.c1, name: 'Churna (Powders)', type: 'MEDICINE' });
  ins('categories', { id: cats.c2, name: 'Vati (Tablets)', type: 'MEDICINE' });
  ins('categories', { id: cats.c3, name: 'Taila (Oils)', type: 'MEDICINE' });
  ins('categories', { id: cats.c4, name: 'Kashaya', type: 'MEDICINE' });
  ins('categories', { id: cats.c5, name: 'Raw Herbs', type: 'RAW_MATERIAL' });
  console.log('  Categories done');

  // Departments
  const depts = { d1: uuidv4(), d2: uuidv4(), d3: uuidv4(), d4: uuidv4(), d5: uuidv4() };
  ins('departments', { id: depts.d1, name: 'OPD' });
  ins('departments', { id: depts.d2, name: 'IPD' });
  ins('departments', { id: depts.d3, name: 'Pharmacy' });
  ins('departments', { id: depts.d4, name: 'Panchakarma' });
  ins('departments', { id: depts.d5, name: 'Emergency' });
  console.log('  Departments done');

  // Suppliers
  const sups = { s1: uuidv4(), s2: uuidv4(), s3: uuidv4() };
  ins('suppliers', { id: sups.s1, name: 'Ayurveda Herbs Ltd.', contactPerson: 'Rajesh Kumar', phone: '9876543210', city: 'Jaipur', leadTime: 7 });
  ins('suppliers', { id: sups.s2, name: 'Dhanvantari Pharma', contactPerson: 'Priya Sharma', phone: '9876543211', city: 'Mumbai', leadTime: 10 });
  ins('suppliers', { id: sups.s3, name: 'Sushruta Surgical', contactPerson: 'Amit Patel', phone: '9876543212', city: 'Delhi', leadTime: 5 });
  console.log('  Suppliers done');

  // Medicines
  const med = { m1: uuidv4(), m2: uuidv4(), m3: uuidv4(), m4: uuidv4(), m5: uuidv4(), m6: uuidv4(), m7: uuidv4(), m8: uuidv4(), m9: uuidv4(), m10: uuidv4() };
  
  ins('medicines', { id: med.m1, name: 'Triphala Churna', categoryId: cats.c1, form: 'Powder', unit: 'kg', manufacturer: 'Dabur', reorderLevel: 10, minStock: 5, maxStock: 50, purchasePrice: 250, sellingPrice: 350, isAyurvedic: 1 });
  ins('inventory', { id: uuidv4(), medicineId: med.m1, totalQuantity: 80, minLevel: 5, maxLevel: 50, reorderPoint: 10 });

  ins('medicines', { id: med.m2, name: 'Trikatu Churna', categoryId: cats.c1, form: 'Powder', unit: 'kg', manufacturer: 'Baidyanath', reorderLevel: 15, minStock: 5, maxStock: 40, purchasePrice: 180, sellingPrice: 260, isAyurvedic: 1 });
  ins('inventory', { id: uuidv4(), medicineId: med.m2, totalQuantity: 32, minLevel: 5, maxLevel: 40, reorderPoint: 15 });

  ins('medicines', { id: med.m3, name: 'Sitopaladi Churna', categoryId: cats.c1, form: 'Powder', unit: 'kg', manufacturer: 'Zandu', reorderLevel: 10, minStock: 5, maxStock: 30, purchasePrice: 220, sellingPrice: 310, isAyurvedic: 1 });
  ins('inventory', { id: uuidv4(), medicineId: med.m3, totalQuantity: 3, minLevel: 5, maxLevel: 30, reorderPoint: 10 });

  ins('medicines', { id: med.m4, name: 'Chyavanprash Vati', categoryId: cats.c2, form: 'Tablet', unit: 'bottle', manufacturer: 'Dabur', reorderLevel: 20, minStock: 10, maxStock: 100, purchasePrice: 150, sellingPrice: 220, isAyurvedic: 1 });
  ins('inventory', { id: uuidv4(), medicineId: med.m4, totalQuantity: 150, minLevel: 10, maxLevel: 100, reorderPoint: 20 });

  ins('medicines', { id: med.m5, name: 'Mahanarayan Taila', categoryId: cats.c3, form: 'Oil', unit: 'liter', manufacturer: 'Kottakkal', reorderLevel: 10, minStock: 5, maxStock: 40, purchasePrice: 350, sellingPrice: 480, isAyurvedic: 1 });
  ins('inventory', { id: uuidv4(), medicineId: med.m5, totalQuantity: 25, minLevel: 5, maxLevel: 40, reorderPoint: 10 });

  ins('medicines', { id: med.m6, name: 'Karpooradi Taila', categoryId: cats.c3, form: 'Oil', unit: 'liter', manufacturer: 'Baidyanath', reorderLevel: 10, minStock: 5, maxStock: 30, purchasePrice: 280, sellingPrice: 390, isAyurvedic: 1 });
  ins('inventory', { id: uuidv4(), medicineId: med.m6, totalQuantity: 4, minLevel: 5, maxLevel: 30, reorderPoint: 10 });

  ins('medicines', { id: med.m7, name: 'Dashamoola Kashay', categoryId: cats.c4, form: 'Liquid', unit: 'bottle', manufacturer: 'AVS', reorderLevel: 20, minStock: 10, maxStock: 80, purchasePrice: 120, sellingPrice: 170, isAyurvedic: 1 });
  ins('inventory', { id: uuidv4(), medicineId: med.m7, totalQuantity: 200, minLevel: 10, maxLevel: 80, reorderPoint: 20 });

  ins('medicines', { id: med.m8, name: 'Ashwagandha Root', categoryId: cats.c5, form: 'Raw', unit: 'kg', manufacturer: 'Ayurveda Herbs', reorderLevel: 15, minStock: 5, maxStock: 60, purchasePrice: 400, sellingPrice: 550, isAyurvedic: 1, botanicalName: 'Withania somnifera' });
  ins('inventory', { id: uuidv4(), medicineId: med.m8, totalQuantity: 55, minLevel: 5, maxLevel: 60, reorderPoint: 15 });

  ins('medicines', { id: med.m9, name: 'Surgical Gloves', categoryId: cats.c5, form: 'Supply', unit: 'box', manufacturer: 'Sushruta', reorderLevel: 30, minStock: 15, maxStock: 200, purchasePrice: 250, sellingPrice: 350, isAyurvedic: 0 });
  ins('inventory', { id: uuidv4(), medicineId: med.m9, totalQuantity: 8, minLevel: 15, maxLevel: 200, reorderPoint: 30 });

  ins('medicines', { id: med.m10, name: 'Bandage Roll', categoryId: cats.c5, form: 'Supply', unit: 'piece', manufacturer: 'Sushruta', reorderLevel: 50, minStock: 20, maxStock: 200, purchasePrice: 15, sellingPrice: 25, isAyurvedic: 0 });
  ins('inventory', { id: uuidv4(), medicineId: med.m10, totalQuantity: 200, minLevel: 20, maxLevel: 200, reorderPoint: 50 });
  
  console.log('  Medicines done');

  // Batches with expiry dates
  const today = new Date();
  function d(days) {
    const dt = new Date(today.getTime() + days * 86400000);
    return dt.toISOString().split('T')[0];
  }

  ins('batches', { id: uuidv4(), medicineId: med.m1, batchNumber: 'TRP-001', quantity: 50, initialQuantity: 50, purchasePrice: 230, manufacturingDate: '2024-01-15', expiryDate: d(365), receivedDate: '2024-01-20', supplierId: sups.s1 });
  ins('batches', { id: uuidv4(), medicineId: med.m1, batchNumber: 'TRP-002', quantity: 30, initialQuantity: 30, purchasePrice: 240, manufacturingDate: '2024-06-01', expiryDate: d(180), receivedDate: '2024-06-10', supplierId: sups.s1 });
  ins('batches', { id: uuidv4(), medicineId: med.m3, batchNumber: 'STP-001', quantity: 3, initialQuantity: 20, purchasePrice: 200, manufacturingDate: '2024-03-01', expiryDate: d(90), receivedDate: '2024-03-15', supplierId: sups.s1 });
  ins('batches', { id: uuidv4(), medicineId: med.m5, batchNumber: 'MNR-001', quantity: 25, initialQuantity: 40, purchasePrice: 320, manufacturingDate: '2024-02-01', expiryDate: d(240), receivedDate: '2024-02-10', supplierId: sups.s2 });
  ins('batches', { id: uuidv4(), medicineId: med.m6, batchNumber: 'KRP-001', quantity: 4, initialQuantity: 15, purchasePrice: 260, manufacturingDate: '2024-04-01', expiryDate: d(60), receivedDate: '2024-04-10', supplierId: sups.s2 });
  ins('batches', { id: uuidv4(), medicineId: med.m9, batchNumber: 'GLV-001', quantity: 8, initialQuantity: 50, purchasePrice: 230, manufacturingDate: '2024-01-01', expiryDate: d(730), receivedDate: '2024-01-15', supplierId: sups.s3 });

  // Expired batch
  ins('batches', { id: uuidv4(), medicineId: med.m1, batchNumber: 'TRP-OLD', quantity: 5, initialQuantity: 20, purchasePrice: 200, manufacturingDate: '2023-01-01', expiryDate: '2024-01-01', receivedDate: '2023-01-15', supplierId: sups.s1 });

  ins('batches', { id: uuidv4(), medicineId: med.m7, batchNumber: 'DSH-001', quantity: 150, initialQuantity: 150, purchasePrice: 100, manufacturingDate: '2024-05-01', expiryDate: d(270), receivedDate: '2024-05-20', supplierId: sups.s2 });
  ins('batches', { id: uuidv4(), medicineId: med.m4, batchNumber: 'CHY-001', quantity: 150, initialQuantity: 150, purchasePrice: 130, manufacturingDate: '2024-06-01', expiryDate: d(300), receivedDate: '2024-06-15', supplierId: sups.s1 });
  ins('batches', { id: uuidv4(), medicineId: med.m10, batchNumber: 'BND-001', quantity: 200, initialQuantity: 200, purchasePrice: 12, manufacturingDate: '2024-06-01', expiryDate: d(900), receivedDate: '2024-06-10', supplierId: sups.s3 });
  console.log('  Batches done');

  // Supplier links
  ins('supplier_medicines', { supplierId: sups.s1, medicineId: med.m1, price: 230 });
  ins('supplier_medicines', { supplierId: sups.s2, medicineId: med.m5, price: 320 });
  ins('supplier_medicines', { supplierId: sups.s3, medicineId: med.m9, price: 230 });

  // Storage locations
  ins('storage_locations', { id: uuidv4(), name: 'Shelf A1', type: 'shelf' });
  ins('storage_locations', { id: uuidv4(), name: 'Refrigerator', type: 'fridge' });

  console.log('\n✅ Seed complete!');
  console.log('\nDemo Accounts:');
  console.log('  admin@meditrack.local / MediTrack@2024');
  console.log('  manager@meditrack.local / manager123');
  console.log('  staff@meditrack.local / staff123');
  console.log('  doctor@meditrack.local / doctor123');
}

seed().then(() => { const { saveDb } = require('./database'); saveDb(); }).catch(e => console.error('Seed error:', e));