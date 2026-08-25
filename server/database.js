const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let SQL = null;

async function getDb() {
  if (!db) {
    if (!SQL) {
      SQL = await initSqlJs();
    }
    const dbDir = process.env.MEDITRACK_DATA || path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    const dbPath = path.join(dbDir, 'meditrack.db');

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');
    initSchema(db);
    saveDb();
  }
  return db;
}

function saveDb() {
  try {
    const dbDir = process.env.MEDITRACK_DATA || path.join(__dirname, '..', 'data');
    const dbPath = path.join(dbDir, 'meditrack.db');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch(e) {
    console.error('Save DB error:', e.message);
  }
}

// Auto-save periodically
setInterval(() => {
  if (db) saveDb();
}, 5000);

// Wrap db.run to auto-save
function run(sql, params = []) {
  const result = db.run(sql, params);
  saveDb();
  return result;
}

function get(sql, params = []) {
  return db.exec(sql, params);
}

// Convert sql.js results to nicer format
function queryAll(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params && params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch(e) {
    console.error('Query error:', sql, e.message);
    return [];
  }
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function execute(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    stmt.run();
    stmt.free();
    return { changes: db.getRowsModified() };
  } catch(e) {
    console.error('Execute error:', e.message);
    throw e;
  }
}

function initSchema(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
      name TEXT NOT NULL, role TEXT DEFAULT 'STAFF', phone TEXT, departmentId TEXT,
      isActive INTEGER DEFAULT 1, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT,
      type TEXT DEFAULT 'MEDICINE', isActive INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, scientificName TEXT, categoryId TEXT,
      form TEXT, strength TEXT, unit TEXT DEFAULT 'pieces', packSize INTEGER DEFAULT 1,
      manufacturer TEXT, reorderLevel INTEGER DEFAULT 10, minStock INTEGER DEFAULT 5,
      maxStock INTEGER DEFAULT 100, purchasePrice REAL DEFAULT 0, sellingPrice REAL DEFAULT 0,
      barcode TEXT UNIQUE, storageCondition TEXT, storageLocationId TEXT,
      isActive INTEGER DEFAULT 1, isAyurvedic INTEGER DEFAULT 1, ayurvedicForm TEXT,
      botanicalName TEXT, partUsed TEXT, source TEXT, qualityGrade TEXT, description TEXT,
      createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY, medicineId TEXT, batchNumber TEXT NOT NULL,
      quantity INTEGER DEFAULT 0, initialQuantity INTEGER DEFAULT 0,
      purchasePrice REAL DEFAULT 0, sellingPrice REAL DEFAULT 0,
      manufacturingDate TEXT, expiryDate TEXT, receivedDate TEXT DEFAULT (datetime('now')),
      supplierId TEXT, locationId TEXT, isActive INTEGER DEFAULT 1, status TEXT DEFAULT 'active',
      createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY, medicineId TEXT UNIQUE, totalQuantity INTEGER DEFAULT 0,
      minLevel INTEGER DEFAULT 5, maxLevel INTEGER DEFAULT 100, reorderPoint INTEGER DEFAULT 10,
      status TEXT DEFAULT 'healthy', lastUpdated TEXT DEFAULT (datetime('now')),
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS stock_in_transactions (
      id TEXT PRIMARY KEY, batchId TEXT NOT NULL, quantity INTEGER NOT NULL,
      purchasePrice REAL, notes TEXT, reference TEXT, userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS stock_out_transactions (
      id TEXT PRIMARY KEY, batchId TEXT NOT NULL, quantity INTEGER NOT NULL,
      departmentId TEXT, purpose TEXT, notes TEXT, userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, contactPerson TEXT, email TEXT, phone TEXT,
      address TEXT, city TEXT, state TEXT, gst TEXT, paymentTerms TEXT,
      leadTime INTEGER DEFAULT 7, isActive INTEGER DEFAULT 1, rating INTEGER DEFAULT 3,
      notes TEXT, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS supplier_medicines (
      supplierId TEXT NOT NULL, medicineId TEXT NOT NULL, price REAL DEFAULT 0,
      isPrimary INTEGER DEFAULT 0, PRIMARY KEY (supplierId, medicineId)
    );
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY, poNumber TEXT UNIQUE NOT NULL, supplierId TEXT,
      status TEXT DEFAULT 'draft', orderDate TEXT DEFAULT (datetime('now')),
      expectedDelivery TEXT, actualDelivery TEXT, totalAmount REAL DEFAULT 0, notes TEXT,
      approvedById TEXT, createdById TEXT,
      createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id TEXT PRIMARY KEY, poId TEXT NOT NULL, medicineId TEXT,
      quantity INTEGER NOT NULL, receivedQuantity INTEGER DEFAULT 0,
      unitPrice REAL DEFAULT0, totalPrice REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT,
      isActive INTEGER DEFAULT 1, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id TEXT PRIMARY KEY, batchId TEXT, fromDepartmentId TEXT, toDepartmentId TEXT,
      quantity INTEGER NOT NULL, notes TEXT, status TEXT DEFAULT 'pending',
      approvedById TEXT, requestedById TEXT,
      createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, itemId TEXT, batchId TEXT,
      message TEXT NOT NULL, severity TEXT DEFAULT 'warning', isRead INTEGER DEFAULT 0,
      isActive INTEGER DEFAULT 1, createdAt TEXT DEFAULT (datetime('now')), resolvedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, userId TEXT, title TEXT NOT NULL, message TEXT NOT NULL,
      type TEXT DEFAULT 'info', isRead INTEGER DEFAULT 0, link TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS wastage (
      id TEXT PRIMARY KEY, batchId TEXT, quantity INTEGER NOT NULL,
      reason TEXT NOT NULL, value REAL DEFAULT 0, notes TEXT, recordedById TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS forecasts (
      id TEXT PRIMARY KEY, medicineId TEXT, month INTEGER NOT NULL,
      year INTEGER NOT NULL, forecastedQty REAL DEFAULT 0, confidence REAL DEFAULT 0,
      method TEXT DEFAULT 'moving_average', createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, userId TEXT, action TEXT NOT NULL, entity TEXT NOT NULL,
      entityId TEXT, details TEXT, oldValue TEXT, newValue TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS storage_locations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, type TEXT DEFAULT 'shelf',
      isActive INTEGER DEFAULT 1, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_batches_medicine ON batches(medicineId);
    CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiryDate);
    CREATE INDEX IF NOT EXISTS idx_inventory_medicine ON inventory(medicineId);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(createdAt);
  `);
}

module.exports = { getDb, queryAll, queryOne, execute, saveDb };