const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb, queryAll, queryOne, execute } = require('./database');

const app = express();
const PORT = process.env.MEDITRACK_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'meditrack-secret-2024';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let dbReady = false;
getDb().then(() => { dbReady = true; console.log('MediTrack server running on port', PORT); }).catch(e => console.error('DB error:', e));

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(auth.split(' ')[1], JWT_SECRET); next(); }
  catch (e) { return res.status(401).json({ error: 'Invalid token' }); }
}

function audit(userId, action, entity, entityId, details, oldVal, newVal) {
  try { execute('INSERT INTO audit_logs (id, userId, action, entity, entityId, details, oldValue, newValue, createdAt) VALUES (?,?,?,?,?,?,?,?,datetime(\'now\'))',
    [uuidv4(), userId||null, action, entity, entityId||null, details||null, oldVal||null, newVal||null]); } catch(e) {}
}

// ============= AUTH =============
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    await getDb();
    const user = queryOne('SELECT * FROM users WHERE email = ? AND isActive = 1', [email]);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    audit(user.id, 'login', 'user', user.id, 'Logged in');
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, departmentId: user.departmentId } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  audit(req.user.id, 'logout', 'user', req.user.id, 'Logged out');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = queryOne('SELECT id, email, name, role, phone, departmentId FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Not found' }); res.json(user);
});

app.get('/api/auth/users', authenticate, (req, res) => {
  res.json(queryAll('SELECT id, email, name, role, phone, departmentId, isActive, createdAt FROM users ORDER BY name'));
});

app.post('/api/auth/users', authenticate, (req, res) => {
  try {
    const { email, password, name, role, phone, departmentId } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Required' });
    if (queryOne('SELECT id FROM users WHERE email = ?', [email])) return res.status(400).json({ error: 'Email exists' });
    const id = uuidv4();
    execute('INSERT INTO users (id, email, password, name, role, phone, departmentId) VALUES (?,?,?,?,?,?,?)',
      [id, email, bcrypt.hashSync(password, 10), name, role||'STAFF', phone||null, departmentId||null]);
    audit(req.user.id, 'create', 'user', id, `Created ${email}`);
    res.json({ id, email, name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/auth/users/:id', authenticate, (req, res) => {
  try {
    const updates = []; const params = [];
    ['name','role','phone','departmentId'].forEach(f => { if (req.body[f]!==undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }});
    if (req.body.isActive!==undefined) { updates.push('isActive=?'); params.push(req.body.isActive?1:0); }
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    params.push(req.params.id);
    execute(`UPDATE users SET ${updates.join(',')}, updatedAt=datetime('now') WHERE id=?`, params);
    audit(req.user.id, 'update', 'user', req.params.id); res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= CATEGORIES =============
app.get('/api/categories', authenticate, (req, res) => { res.json(queryAll('SELECT * FROM categories WHERE isActive=1 ORDER BY name')); });
app.post('/api/categories', authenticate, (req, res) => {
  try {
    const { name, description, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = uuidv4(); execute('INSERT INTO categories(id,name,description,type) VALUES(?,?,?,?)', [id, name, description||null, type||'MEDICINE']);
    res.json({ id, name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= MEDICINES =============
app.get('/api/medicines', authenticate, (req, res) => {
  try {
    const { search, categoryId } = req.query;
    let sql = 'SELECT m.*, c.name as categoryName FROM medicines m LEFT JOIN categories c ON m.categoryId=c.id WHERE m.isActive=1';
    const params = [];
    if (search) { sql += ' AND (m.name LIKE ? OR m.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (categoryId) { sql += ' AND m.categoryId=?'; params.push(categoryId); }
    sql += ' ORDER BY m.name';
    const meds = queryAll(sql, params);
    meds.forEach(m => { const inv = queryOne('SELECT totalQuantity FROM inventory WHERE medicineId=?', [m.id]); m.currentStock = inv ? inv.totalQuantity : 0; });
    res.json(meds);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/medicines/:id', authenticate, (req, res) => {
  try {
    const m = queryOne('SELECT m.*, c.name as categoryName FROM medicines m LEFT JOIN categories c ON m.categoryId=c.id WHERE m.id=?', [req.params.id]);
    if (!m) return res.status(404).json({ error: 'Not found' });
    m.batches = queryAll('SELECT b.*, s.name as supplierName FROM batches b LEFT JOIN suppliers s ON b.supplierId=s.id WHERE b.medicineId=? ORDER BY b.expiryDate ASC', [req.params.id]);
    m.inventory = queryOne('SELECT * FROM inventory WHERE medicineId=?', [req.params.id]) || { totalQuantity: 0 };
    res.json(m);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/medicines', authenticate, (req, res) => {
  try {
    const id = uuidv4();
    const { name, scientificName, categoryId, form, strength, unit, packSize, manufacturer, reorderLevel, minStock, maxStock, purchasePrice, sellingPrice, barcode, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    execute(`INSERT INTO medicines(id,name,scientificName,categoryId,form,strength,unit,packSize,manufacturer,reorderLevel,minStock,maxStock,purchasePrice,sellingPrice,barcode,description,isAyurvedic) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [id, name, scientificName||null, categoryId||null, form||null, strength||null, unit||'pieces', packSize||1, manufacturer||null, reorderLevel||10, minStock||5, maxStock||100, purchasePrice||0, sellingPrice||0, barcode||null, description||null]);
    execute('INSERT INTO inventory(id,medicineId,totalQuantity,minLevel,maxLevel,reorderPoint) VALUES(?,?,0,?,?,?)', [uuidv4(), id, minStock||5, maxStock||100, reorderLevel||10]);
    res.json({ id, name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/medicines/:id', authenticate, (req, res) => {
  try {
    const allowed = ['name','scientificName','categoryId','form','strength','unit','packSize','manufacturer','reorderLevel','minStock','maxStock','purchasePrice','sellingPrice','barcode','description','isActive'];
    const updates = []; const params = [];
    allowed.forEach(f => { if (req.body[f]!==undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }});
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    params.push(req.params.id);
    execute(`UPDATE medicines SET ${updates.join(',')}, updatedAt=datetime('now') WHERE id=?`, params);
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/medicines/:id', authenticate, (req, res) => {
  execute("UPDATE medicines SET isActive=0, updatedAt=datetime('now') WHERE id=?", [req.params.id]);
  res.json({ message: 'Deactivated' });
});

app.post('/api/medicines/:id/batches', authenticate, (req, res) => {
  try {
    const { batchNumber, quantity, purchasePrice, manufacturingDate, expiryDate, supplierId } = req.body;
    if (!batchNumber || !quantity || quantity<=0) return res.status(400).json({ error: 'Required' });
    const id = uuidv4();
    execute(`INSERT INTO batches(id,medicineId,batchNumber,quantity,initialQuantity,purchasePrice,manufacturingDate,expiryDate,receivedDate,supplierId) VALUES(?,?,?,?,?,?,?,?,datetime('now'),?)`,
      [id, req.params.id, batchNumber, quantity, quantity, purchasePrice||0, manufacturingDate||null, expiryDate||null, supplierId||null]);
    const inv = queryOne('SELECT id FROM inventory WHERE medicineId=?', [req.params.id]);
    if (inv) execute("UPDATE inventory SET totalQuantity=totalQuantity+?, lastUpdated=datetime('now') WHERE id=?", [quantity, inv.id]);
    else execute("INSERT INTO inventory(id,medicineId,totalQuantity) VALUES(?,?,?)", [uuidv4(), req.params.id, quantity]);
    execute("INSERT INTO stock_in_transactions(id,batchId,quantity,userId,createdAt) VALUES(?,?,?,?,datetime('now'))", [uuidv4(), id, quantity, req.user.id]);
    res.json({ id, batchNumber });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= INVENTORY =============
app.get('/api/inventory', authenticate, (req, res) => {
  try {
    const { search, categoryId } = req.query;
    let sql = `SELECT inv.*, m.name as medicineName, m.barcode, c.name as categoryName, m.reorderLevel, m.minStock, m.maxStock, m.unit, m.purchasePrice
      FROM inventory inv JOIN medicines m ON inv.medicineId=m.id LEFT JOIN categories c ON m.categoryId=c.id WHERE m.isActive=1`;
    const params = [];
    if (search) { sql += ' AND (m.name LIKE ? OR m.barcode LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (categoryId) { sql += ' AND m.categoryId=?'; params.push(categoryId); }
    sql += ' ORDER BY m.name';
    const items = queryAll(sql, params);
    items.forEach(item => {
      if (item.totalQuantity <= 0) item.invStatus = 'outOfStock';
      else if (item.totalQuantity <= item.minStock) item.invStatus = 'critical';
      else if (item.totalQuantity <= item.reorderLevel) item.invStatus = 'low';
      else if (item.totalQuantity >= item.maxStock * 1.2) item.invStatus = 'overstocked';
      else item.invStatus = 'healthy';
    });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/summary', authenticate, (req, res) => {
  try {
    const all = queryAll('SELECT inv.*, m.minStock, m.reorderLevel, m.maxStock, m.purchasePrice FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1');
    let totalItems=all.length, totalValue=0, lowStock=0, critical=0, outOfStock=0, overstocked=0;
    all.forEach(i => {
      totalValue += (i.totalQuantity||0)*(i.purchasePrice||0);
      if (i.totalQuantity<=0) outOfStock++;
      else if (i.totalQuantity<=i.minStock) critical++;
      else if (i.totalQuantity<=i.reorderLevel) lowStock++;
      else if (i.totalQuantity>=i.maxStock*1.2) overstocked++;
    });
    const exp = queryOne("SELECT COALESCE(SUM(quantity),0) as cnt, COALESCE(SUM(quantity*purchasePrice),0) as val FROM batches WHERE expiryDate<date('now') AND isActive=1 AND quantity>0");
    const expiring = queryOne("SELECT COALESCE(SUM(quantity),0) as cnt FROM batches WHERE expiryDate BETWEEN date('now') AND date('now','+30 days') AND isActive=1 AND quantity>0");
    res.json({ totalItems, totalValue, lowStock, critical, outOfStock, overstocked, expiredItems: exp?exp.cnt:0, expiredValue: exp?exp.val:0, expiringSoon: expiring?expiring.cnt:0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/expiring', authenticate, (req, res) => {
  try {
    const days = req.query.days || 30;
    const future = new Date(Date.now()+parseInt(days)*86400000).toISOString().split('T')[0];
    res.json(queryAll('SELECT b.*, m.name as medicineName, m.barcode, m.unit FROM batches b JOIN medicines m ON b.medicineId=m.id WHERE b.expiryDate BETWEEN date(\'now\') AND ? AND b.isActive=1 AND b.quantity>0 ORDER BY b.expiryDate ASC', [future]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stock In
app.get('/api/stock-in', authenticate, (req, res) => {
  const limit = req.query.limit;
  let sql = 'SELECT si.*, u.name as userName, m.name as medicineName, b.batchNumber FROM stock_in_transactions si JOIN batches b ON si.batchId=b.id JOIN medicines m ON b.medicineId=m.id LEFT JOIN users u ON si.userId=u.id ORDER BY si.createdAt DESC';
  if (limit) sql += ` LIMIT ${parseInt(limit)}`;
  res.json(queryAll(sql));
});

app.post('/api/stock-in', authenticate, (req, res) => {
  try {
    const { medicineId, batchNumber, quantity, purchasePrice, manufacturingDate, expiryDate, supplierId, notes } = req.body;
    if (!medicineId || !batchNumber || !quantity) return res.status(400).json({ error: 'Required' });
    const batchId = uuidv4();
    execute(`INSERT INTO batches(id,medicineId,batchNumber,quantity,initialQuantity,purchasePrice,manufacturingDate,expiryDate,receivedDate,supplierId) VALUES(?,?,?,?,?,?,?,?,datetime('now'),?)`,
      [batchId, medicineId, batchNumber, quantity, quantity, purchasePrice||0, manufacturingDate||null, expiryDate||null, supplierId||null]);
    const inv = queryOne('SELECT id FROM inventory WHERE medicineId=?', [medicineId]);
    if (inv) execute("UPDATE inventory SET totalQuantity=totalQuantity+?, lastUpdated=datetime('now') WHERE id=?", [quantity, inv.id]);
    else execute("INSERT INTO inventory(id,medicineId,totalQuantity) VALUES(?,?,?)", [uuidv4(), medicineId, quantity]);
    execute("INSERT INTO stock_in_transactions(id,batchId,quantity,purchasePrice,notes,userId,createdAt) VALUES(?,?,?,?,?,?,datetime('now'))",
      [uuidv4(), batchId, quantity, purchasePrice||0, notes||null, req.user.id]);
    res.json({ id: batchId, message: 'Stock-in recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stock Out with FEFO
app.get('/api/stock-out', authenticate, (req, res) => {
  const limit = req.query.limit;
  let sql = 'SELECT so.*, u.name as userName, m.name as medicineName, b.batchNumber, d.name as departmentName FROM stock_out_transactions so JOIN batches b ON so.batchId=b.id JOIN medicines m ON b.medicineId=m.id LEFT JOIN users u ON so.userId=u.id LEFT JOIN departments d ON so.departmentId=d.id ORDER BY so.createdAt DESC';
  if (limit) sql += ` LIMIT ${parseInt(limit)}`;
  res.json(queryAll(sql));
});

app.post('/api/stock-out', authenticate, (req, res) => {
  try {
    const { medicineId, quantity, departmentId, purpose, notes } = req.body;
    if (!medicineId || !quantity) return res.status(400).json({ error: 'Required' });
    if (quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' });
    const batches = queryAll('SELECT * FROM batches WHERE medicineId=? AND isActive=1 AND quantity>0 AND (expiryDate IS NULL OR expiryDate>=date(\'now\')) ORDER BY expiryDate ASC', [medicineId]);
    if (!batches.length) return res.status(400).json({ error: 'No available stock' });
    let remaining = quantity; const txnDetails = [];
    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.quantity);
      execute("UPDATE batches SET quantity=quantity-?, updatedAt=datetime('now') WHERE id=?", [take, batch.id]);
      execute("INSERT INTO stock_out_transactions(id,batchId,quantity,departmentId,purpose,notes,userId,createdAt) VALUES(?,?,?,?,?,?,?,datetime('now'))",
        [uuidv4(), batch.id, take, departmentId||null, purpose||null, notes||null, req.user.id]);
      txnDetails.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantity: take });
      remaining -= take;
    }
    if (remaining > 0) return res.status(400).json({ error: `Only ${quantity-remaining} of ${quantity} available` });
    res.json({ message: 'Stock-out completed', transactions: txnDetails });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= SUPPLIERS =============
app.get('/api/suppliers', authenticate, (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM suppliers WHERE isActive=1'; const params = [];
    if (search) { sql += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    sql += ' ORDER BY name';
    const suppliers = queryAll(sql, params);
    suppliers.forEach(s => {
      s.medicineCount = queryOne('SELECT COUNT(*) as c FROM supplier_medicines WHERE supplierId=?', [s.id]).c;
      s.poCount = queryOne('SELECT COUNT(*) as c FROM purchase_orders WHERE supplierId=?', [s.id]).c;
    });
    res.json(suppliers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/suppliers/:id', authenticate, (req, res) => {
  try {
    const s = queryOne('SELECT * FROM suppliers WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ error: 'Not found' });
    s.purchaseOrders = queryAll('SELECT * FROM purchase_orders WHERE supplierId=? ORDER BY createdAt DESC LIMIT 10', [req.params.id]);
    res.json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/suppliers', authenticate, (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, city, state, gst, paymentTerms, leadTime } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = uuidv4();
    execute('INSERT INTO suppliers(id,name,contactPerson,email,phone,address,city,state,gst,paymentTerms,leadTime) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      [id, name, contactPerson||null, email||null, phone||null, address||null, city||null, state||null, gst||null, paymentTerms||null, leadTime||7]);
    res.json({ id, name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/suppliers/:id', authenticate, (req, res) => {
  try {
    const allowed = ['name','contactPerson','email','phone','address','city','state','gst','paymentTerms','leadTime','rating','notes','isActive'];
    const updates = []; const params = [];
    allowed.forEach(f => { if (req.body[f]!==undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }});
    if (!updates.length) return res.status(400).json({ error: 'No fields' });
    params.push(req.params.id);
    execute(`UPDATE suppliers SET ${updates.join(',')}, updatedAt=datetime('now') WHERE id=?`, params);
    res.json({ message: 'Updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/suppliers/:id', authenticate, (req, res) => {
  execute("UPDATE suppliers SET isActive=0, updatedAt=datetime('now') WHERE id=?", [req.params.id]); res.json({ message: 'Deactivated' });
});

app.post('/api/suppliers/:id/medicines', authenticate, (req, res) => {
  try {
    const { medicineId, price } = req.body;
    execute('INSERT OR REPLACE INTO supplier_medicines(supplierId,medicineId,price) VALUES(?,?,?)', [req.params.id, medicineId, price||0]);
    res.json({ message: 'Linked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= PURCHASE ORDERS =============
function genPO() { return `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9999)).padStart(4,'0')}`; }

app.get('/api/purchase-orders', authenticate, (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT po.*, s.name as supplierName, u.name as createdByName FROM purchase_orders po LEFT JOIN suppliers s ON po.supplierId=s.id LEFT JOIN users u ON po.createdById=u.id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND po.status=?'; params.push(status); }
    sql += ' ORDER BY po.createdAt DESC';
    res.json(queryAll(sql, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/purchase-orders/:id', authenticate, (req, res) => {
  try {
    const po = queryOne('SELECT po.*, s.name as supplierName FROM purchase_orders po LEFT JOIN suppliers s ON po.supplierId=s.id WHERE po.id=?', [req.params.id]);
    if (!po) return res.status(404).json({ error: 'Not found' });
    po.items = queryAll('SELECT poi.*, m.name as medicineName, m.unit FROM purchase_order_items poi LEFT JOIN medicines m ON poi.medicineId=m.id WHERE poi.poId=?', [req.params.id]);
    res.json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/purchase-orders', authenticate, (req, res) => {
  try {
    const { supplierId, items, expectedDelivery, notes } = req.body;
    if (!supplierId || !items || !items.length) return res.status(400).json({ error: 'Supplier and items required' });
    const id = uuidv4(); const poNum = genPO(); let totalAmount = 0;
    execute("INSERT INTO purchase_orders(id,poNumber,supplierId,status,expectedDelivery,notes,createdById,createdAt) VALUES(?,?,?,'draft',?,?,?,datetime('now'))",
      [id, poNum, supplierId, expectedDelivery||null, notes||null, req.user.id]);
    items.forEach(item => {
      const tp = (item.unitPrice||0) * item.quantity; totalAmount += tp;
      execute('INSERT INTO purchase_order_items(id,poId,medicineId,quantity,unitPrice,totalPrice) VALUES(?,?,?,?,?,?)',
        [uuidv4(), id, item.medicineId||null, item.quantity, item.unitPrice||0, tp]);
    });
    execute('UPDATE purchase_orders SET totalAmount=? WHERE id=?', [totalAmount, id]);
    res.json({ id, poNumber: poNum, totalAmount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/purchase-orders/:id/status', authenticate, (req, res) => {
  try {
    const { status, actualDelivery } = req.body;
    if (!status) return res.status(400).json({ error: 'Status required' });
    const updates = ['status=?']; const params = [status];
    if (actualDelivery) { updates.push('actualDelivery=?'); params.push(actualDelivery); }
    if (status === 'approved') { updates.push('approvedById=?'); params.push(req.user.id); }
    params.push(req.params.id);
    execute(`UPDATE purchase_orders SET ${updates.join(',')}, updatedAt=datetime('now') WHERE id=?`, params);
    res.json({ message: `Status: ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/purchase-orders/:id/receive', authenticate, (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: 'Items required' });
    for (const item of items) {
      const poi = queryOne('SELECT * FROM purchase_order_items WHERE id=?', [item.id]);
      if (!poi) continue;
      const qty = item.receivedQuantity || item.quantity;
      execute('UPDATE purchase_order_items SET receivedQuantity=receivedQuantity+? WHERE id=?', [qty, item.id]);
      if (poi.medicineId) {
        const batchId = uuidv4();
        execute(`INSERT INTO batches(id,medicineId,batchNumber,quantity,initialQuantity,purchasePrice,receivedDate,supplierId)
          VALUES(?,?,?,?,?,?,datetime('now'),(SELECT supplierId FROM purchase_orders WHERE id=?))`,
          [batchId, poi.medicineId, `PO-${Date.now()}`, qty, qty, poi.unitPrice, poi.poId]);
        execute("INSERT INTO stock_in_transactions(id,batchId,quantity,purchasePrice,reference,userId,createdAt) VALUES(?,?,?,?,?,?,datetime('now'))",
          [uuidv4(), batchId, qty, poi.unitPrice, poi.poId, req.user.id]);
        const inv = queryOne('SELECT id FROM inventory WHERE medicineId=?', [poi.medicineId]);
        if (inv) execute("UPDATE inventory SET totalQuantity=totalQuantity+?, lastUpdated=datetime('now') WHERE id=?", [qty, inv.id]);
        else execute("INSERT INTO inventory(id,medicineId,totalQuantity) VALUES(?,?,?)", [uuidv4(), poi.medicineId, qty]);
      }
    }
    const allItems = queryAll('SELECT * FROM purchase_order_items WHERE poId=?', [req.params.id]);
    const allReceived = allItems.every(i => i.receivedQuantity >= i.quantity);
    execute('UPDATE purchase_orders SET status=?, actualDelivery=datetime(\'now\'), updatedAt=datetime(\'now\') WHERE id=?', [allReceived?'received':'partial', req.params.id]);
    res.json({ message: 'Received' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= DEPARTMENTS =============
app.get('/api/departments', authenticate, (req, res) => { res.json(queryAll('SELECT * FROM departments WHERE isActive=1 ORDER BY name')); });
app.post('/api/departments', authenticate, (req, res) => {
  try { const { name, description } = req.body; const id = uuidv4(); execute('INSERT INTO departments(id,name,description) VALUES(?,?,?)', [id, name, description||null]); res.json({ id, name }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= TRANSFERS =============
app.get('/api/transfers', authenticate, (req, res) => {
  res.json(queryAll('SELECT st.*, fd.name as fromDept, td.name as toDept, u.name as requestedBy FROM stock_transfers st LEFT JOIN departments fd ON st.fromDepartmentId=fd.id LEFT JOIN departments td ON st.toDepartmentId=td.id LEFT JOIN users u ON st.requestedById=u.id ORDER BY st.createdAt DESC'));
});

app.post('/api/transfers', authenticate, (req, res) => {
  try {
    const { batchId, fromDepartmentId, toDepartmentId, quantity, notes } = req.body;
    if (!batchId || !fromDepartmentId || !toDepartmentId || !quantity) return res.status(400).json({ error: 'Required' });
    const batch = queryOne('SELECT * FROM batches WHERE id=?', [batchId]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    if (batch.quantity < quantity) return res.status(400).json({ error: 'Insufficient quantity' });
    execute('UPDATE batches SET quantity=quantity-?, updatedAt=datetime(\'now\') WHERE id=?', [quantity, batchId]);
    const id = uuidv4();
    execute("INSERT INTO stock_transfers(id,batchId,fromDepartmentId,toDepartmentId,quantity,notes,status,requestedById,createdAt) VALUES(?,?,?,?,?,?,'completed',?,datetime('now'))",
      [id, batchId, fromDepartmentId, toDepartmentId, quantity, notes||null, req.user.id]);
    res.json({ id, message: 'Transfer completed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= WASTAGE =============
app.post('/api/wastage', authenticate, (req, res) => {
  try {
    const { batchId, quantity, reason, notes } = req.body;
    if (!batchId || !quantity || !reason) return res.status(400).json({ error: 'Required' });
    const batch = queryOne('SELECT * FROM batches WHERE id=?', [batchId]);
    if (!batch) return res.status(404).json({ error: 'Not found' }); if (batch.quantity<quantity) return res.status(400).json({ error: 'Insufficient' });
    const value = quantity * batch.purchasePrice;
    execute('UPDATE batches SET quantity=quantity-?, updatedAt=datetime(\'now\') WHERE id=?', [quantity, batchId]);
    execute("INSERT INTO wastage(id,batchId,quantity,reason,value,notes,recordedById,createdAt) VALUES(?,?,?,?,?,?,?,datetime('now'))",
      [uuidv4(), batchId, quantity, reason, value, notes||null, req.user.id]);
    const inv = queryOne('SELECT id FROM inventory WHERE medicineId=?', [batch.medicineId]);
    if (inv) execute("UPDATE inventory SET totalQuantity=totalQuantity-?, lastUpdated=datetime('now') WHERE id=?", [quantity, inv.id]);
    res.json({ message: 'Wastage recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/wastage', authenticate, (req, res) => {
  res.json(queryAll('SELECT w.*, m.name as medicineName, b.batchNumber, u.name as recordedByName FROM wastage w LEFT JOIN batches b ON w.batchId=b.id LEFT JOIN medicines m ON b.medicineId=m.id LEFT JOIN users u ON w.recordedById=u.id ORDER BY w.createdAt DESC'));
});

// ============= STORAGE LOCATIONS =============
app.get('/api/storage-locations', authenticate, (req, res) => { res.json(queryAll('SELECT * FROM storage_locations WHERE isActive=1 ORDER BY name')); });
app.post('/api/storage-locations', authenticate, (req, res) => {
  try { const { name, description, type } = req.body; const id = uuidv4(); execute('INSERT INTO storage_locations(id,name,description,type) VALUES(?,?,?,?)', [id, name, description||null, type||'shelf']); res.json({ id, name }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= ANALYTICS =============
app.get('/api/analytics/dashboard', authenticate, (req, res) => {
  try {
    const all = queryAll('SELECT inv.*, m.minStock, m.reorderLevel, m.maxStock, m.purchasePrice FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1');
    let totalItems=all.length, totalValue=0, lowStock=0, critical=0, outOfStock=0;
    all.forEach(i => { totalValue += (i.totalQuantity||0)*(i.purchasePrice||0); if (i.totalQuantity<=0) outOfStock++; else if (i.totalQuantity<=i.minStock) critical++; else if (i.totalQuantity<=i.reorderLevel) lowStock++; });
    const todayIn = queryOne("SELECT COALESCE(SUM(quantity),0) as t FROM stock_in_transactions WHERE date(createdAt)=date('now')").t;
    const todayOut = queryOne("SELECT COALESCE(SUM(quantity),0) as t FROM stock_out_transactions WHERE date(createdAt)=date('now')").t;
    const expired = queryOne("SELECT COALESCE(SUM(quantity),0) as t FROM batches WHERE expiryDate<date('now') AND isActive=1 AND quantity>0").t;
    const expiringS = queryOne("SELECT COALESCE(SUM(quantity),0) as t FROM batches WHERE expiryDate BETWEEN date('now') AND date('now','+30 days') AND isActive=1 AND quantity>0").t;
    const pendingPOs = queryOne("SELECT COUNT(*) as t FROM purchase_orders WHERE status IN ('draft','pending','approved')").t;
    const readiness = Math.max(0, Math.min(100, 100 - (critical*5) - (outOfStock*10)));
    const deptUsage = queryAll('SELECT d.name, COALESCE(SUM(so.quantity),0) as total FROM departments d LEFT JOIN stock_out_transactions so ON d.id=so.departmentId GROUP BY d.id ORDER BY total DESC');
    res.json({ totalItems, totalValue, lowStock, critical, outOfStock, todayStockIn: todayIn, todayStockOut: todayOut, expired, expiringSoon: expiringS, pendingPOs, readinessScore: readiness, deptUsage });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/analytics/abc-ved', authenticate, (req, res) => {
  try {
    const items = queryAll('SELECT inv.*, m.name as medicineName, m.unit, m.purchasePrice FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1 ORDER BY (inv.totalQuantity*m.purchasePrice) DESC');
    const totalValue = items.reduce((s,i) => s+(i.totalQuantity||0)*(i.purchasePrice||0), 0);
    let cum = 0;
    const classified = items.map(i => {
      const val = (i.totalQuantity||0)*(i.purchasePrice||0); cum += val;
      const c = totalValue>0 ? (cum/totalValue)*100 : 0;
      let abc = 'C'; if (c<=70) abc='A'; else if (c<=90) abc='B';
      const ved = i.totalQuantity<=i.minStock?'V':i.totalQuantity<=i.reorderLevel?'E':'D';
      return { ...i, value: val, abc, ved };
    });
    res.json({ items: classified, totalValue });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/analytics/consumption', authenticate, (req, res) => {
  res.json({ monthly: queryAll("SELECT strftime('%Y-%m',createdAt) as month, SUM(quantity) as total FROM stock_out_transactions GROUP BY month ORDER BY month DESC LIMIT 12"),
    byMedicine: queryAll('SELECT m.name, SUM(so.quantity) as total FROM stock_out_transactions so JOIN batches b ON so.batchId=b.id JOIN medicines m ON b.medicineId=m.id GROUP BY m.name ORDER BY total DESC LIMIT 10') });
});

// ============= AI =============
app.get('/api/ai/forecast/:medicineId', authenticate, (req, res) => {
  try {
    const med = queryOne('SELECT * FROM medicines WHERE id=?', [req.params.medicineId]);
    if (!med) return res.status(404).json({ error: 'Not found' });
    const data = queryAll("SELECT strftime('%Y-%m',so.createdAt) as month, SUM(so.quantity) as total FROM stock_out_transactions so JOIN batches b ON so.batchId=b.id WHERE b.medicineId=? GROUP BY month ORDER BY month", [req.params.medicineId]);
    const vals = data.map(d => d.total);
    const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    const forecastQty = Math.round(avg*1.1);
    const conf = Math.min(0.9, vals.length*0.1);
    const inv = queryOne('SELECT * FROM inventory WHERE medicineId=?', [req.params.medicineId]);
    const pending = queryOne("SELECT COALESCE(SUM(poi.quantity-poi.receivedQuantity),0) as t FROM purchase_order_items poi JOIN purchase_orders po ON poi.poId=po.id WHERE poi.medicineId=? AND po.status NOT IN ('cancelled','received')", [req.params.medicineId]).t;
    res.json({ medicineId: req.params.medicineId, medicineName: med.name, currentStock: inv?inv.totalQuantity:0, avgConsumption: Math.round(avg), forecastQty, confidence: parseFloat(conf.toFixed(2)), pendingPO: pending, dataPoints: vals.length, method: vals.length>=3?'moving_average':'insufficient_data', message: vals.length<3?'Limited data - low confidence':null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ai/purchase-advisor', authenticate, (req, res) => {
  try {
    const items = queryAll('SELECT inv.*, m.name as medicineName, m.reorderLevel, m.minStock, m.maxStock, m.purchasePrice FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1');
    const recommendations = items.map(item => {
      const stock = item.totalQuantity||0;
      const pending = queryOne("SELECT COALESCE(SUM(poi.quantity-poi.receivedQuantity),0) as t FROM purchase_order_items poi JOIN purchase_orders po ON poi.poId=po.id WHERE poi.medicineId=? AND po.status NOT IN ('cancelled','received')", [item.medicineId]).t;
      let rec = 'WAIT', reason = 'Stock level adequate', qty = 0;
      if (stock <= item.minStock) { rec = 'BUY NOW'; qty = Math.max(item.reorderLevel, 10) - stock + pending; reason = `Critical (${stock}). Min: ${item.minStock}. Buy ${qty} units.`; }
      else if (stock <= item.reorderLevel) { rec = 'BUY SOON'; qty = Math.max(item.reorderLevel,10) - stock + pending; reason = `Low (${stock}). Reorder: ${item.reorderLevel}. Consider ${qty} units.`; }
      else if (stock >= item.maxStock*1.2) { rec = 'REDUCE PURCHASE'; reason = `Overstocked (${stock}/${item.maxStock}).`; }
      return { medicineId: item.medicineId, medicineName: item.medicineName, currentStock: stock, reorderLevel: item.reorderLevel, minStock: item.minStock, maxStock: item.maxStock, pendingPO: pending, recommendation: rec, reason, suggestedQty: Math.max(0,qty), risk: stock<=item.minStock?'HIGH':stock<=item.reorderLevel?'MEDIUM':'LOW' };
    });
    res.json(recommendations);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ai/emergency-readiness', authenticate, (req, res) => {
  try {
    const critical = queryAll('SELECT inv.*, m.name as medicineName, m.minStock, m.reorderLevel FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1 AND inv.totalQuantity<=m.minStock');
    const total = queryOne("SELECT COUNT(*) as c FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1").c;
    const oos = critical.filter(i => i.totalQuantity<=0).length;
    const score = Math.max(0, Math.min(100, 100 - (critical.length*5) - (oos*15) + (total>0?10:0)));
    res.json({ readinessScore: score, readinessLevel: score>=80?'SAFE':score>=50?'WARNING':'CRITICAL', totalItems: total, shortageItems: critical.length, outOfStockItems: oos,
      criticalItems: critical.map(i => ({ medicineId: i.medicineId, medicineName: i.medicineName, currentStock: i.totalQuantity, minRequired: i.minStock, status: i.totalQuantity<=0?'OUT_OF_STOCK':'CRITICAL' })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/ai/assistant', authenticate, (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });
    const q = query.toLowerCase(); let answer = ''; let data = null;
    if (q.includes('expir') && q.includes('30')) { data = queryAll("SELECT b.*, m.name as medicineName FROM batches b JOIN medicines m ON b.medicineId=m.id WHERE b.expiryDate BETWEEN date('now') AND date('now','+30 days') AND b.isActive=1 AND b.quantity>0"); answer = `${data.length} batches expiring within 30 days.`; }
    else if (q.includes('critical')) { data = queryAll('SELECT inv.*, m.name as medicineName FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1 AND inv.totalQuantity<=m.minStock'); answer = `${data.length} critically low items.`; }
    else if (q.includes('purchase') || q.includes('buy')) { data = queryAll('SELECT inv.*, m.name as medicineName FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1 AND inv.totalQuantity<=m.reorderLevel'); answer = `${data.length} items need purchasing.`; }
    else if (q.includes('value')) { const v = queryOne("SELECT COALESCE(SUM(inv.totalQuantity*m.purchasePrice),0) as v FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1").v; answer = `Total inventory value: ₹${parseFloat(v).toLocaleString('en-IN')}`; }
    else if (q.includes('expired')) { data = queryAll("SELECT b.*, m.name as medicineName FROM batches b JOIN medicines m ON b.medicineId=m.id WHERE b.expiryDate<date('now') AND b.isActive=1 AND b.quantity>0"); answer = `${data.length} expired batches.`; }
    else if (q.includes('redistribute') || q.includes('excess')) { data = queryAll('SELECT inv.*, m.name as medicineName FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1 AND inv.totalQuantity>=m.maxStock*1.2'); answer = `${data.length} overstocked items for possible redistribution.`; }
    else { const s = queryOne("SELECT COUNT(*) as cnt, COALESCE(SUM(totalQuantity),0) as qty FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1"); answer = `MediTrack: ${s.cnt} items, ${s.qty} units. How can I help?`; }
    res.json({ answer, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= REPORTS =============
app.get('/api/reports/:type', authenticate, (req, res) => {
  try {
    const { type } = req.params; const { from, to } = req.query;
    const dateFilter = from && to ? ` AND date(createdAt) BETWEEN '${from}' AND '${to}'` : '';
    let data = [], title = '';
    switch (type) {
      case 'inventory': title='Inventory Report'; data=queryAll('SELECT m.name, m.barcode, c.name as category, inv.totalQuantity, m.minStock, m.reorderLevel, m.maxStock, m.purchasePrice, (inv.totalQuantity*m.purchasePrice) as value FROM inventory inv JOIN medicines m ON inv.medicineId=m.id LEFT JOIN categories c ON m.categoryId=c.id WHERE m.isActive=1 ORDER BY m.name'); break;
      case 'stock-in': title='Stock-In Report'; data=queryAll(`SELECT si.*, u.name as user, m.name as medicine, b.batchNumber FROM stock_in_transactions si JOIN batches b ON si.batchId=b.id JOIN medicines m ON b.medicineId=m.id LEFT JOIN users u ON si.userId=u.id WHERE 1=1${dateFilter} ORDER BY si.createdAt DESC`); break;
      case 'stock-out': title='Stock-Out Report'; data=queryAll(`SELECT so.*, u.name as user, m.name as medicine, b.batchNumber, d.name as department FROM stock_out_transactions so JOIN batches b ON so.batchId=b.id JOIN medicines m ON b.medicineId=m.id LEFT JOIN users u ON so.userId=u.id LEFT JOIN departments d ON so.departmentId=d.id WHERE 1=1${dateFilter} ORDER BY so.createdAt DESC`); break;
      case 'expiry': title='Expiry Report'; data=queryAll('SELECT m.name as medicine, b.batchNumber, b.quantity, b.expiryDate, b.purchasePrice, (b.quantity*b.purchasePrice) as value FROM batches b JOIN medicines m ON b.medicineId=m.id WHERE b.isActive=1 AND b.quantity>0 ORDER BY b.expiryDate ASC'); break;
      case 'wastage': title='Wastage Report'; data=queryAll(`SELECT w.*, m.name as medicine, b.batchNumber, u.name as recordedBy FROM wastage w LEFT JOIN batches b ON w.batchId=b.id LEFT JOIN medicines m ON b.medicineId=m.id LEFT JOIN users u ON w.recordedById=u.id WHERE 1=1${dateFilter} ORDER BY w.createdAt DESC`); break;
      case 'purchase': title='Purchase Orders Report'; data=queryAll(`SELECT po.*, s.name as supplier FROM purchase_orders po LEFT JOIN suppliers s ON po.supplierId=s.id WHERE 1=1${dateFilter} ORDER BY po.createdAt DESC`); break;
      case 'audit': title='Audit Log'; data=queryAll(`SELECT al.*, u.name as user FROM audit_logs al LEFT JOIN users u ON al.userId=u.id WHERE 1=1${dateFilter} ORDER BY al.createdAt DESC`); break;
      default: return res.status(404).json({ error: 'Report type not found' });
    }
    res.json({ title, data, type, generatedAt: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= NOTIFICATIONS =============
app.get('/api/notifications', authenticate, (req, res) => {
  try {
    // Auto-generate alerts
    const lowStock = queryAll('SELECT m.name FROM inventory inv JOIN medicines m ON inv.medicineId=m.id WHERE m.isActive=1 AND inv.totalQuantity<=m.minStock');
    const expiring = queryAll("SELECT m.name FROM batches b JOIN medicines m ON b.medicineId=m.id WHERE b.isActive=1 AND b.quantity>0 AND b.expiryDate BETWEEN date('now') AND date('now','+30 days')");
    lowStock.forEach(item => { const existing = queryOne("SELECT id FROM notifications WHERE message LIKE ? AND date(createdAt)=date('now')", [`%${item.name}%`]); if(!existing) execute("INSERT INTO notifications(id,userId,title,message,type,createdAt) VALUES(?,?,?,'Low Stock: '+?,?,datetime('now'))", [uuidv4(),req.user.id,'Low Stock Alert',item.name+' is below minimum stock','warning']); });
    expiring.forEach(item => { const existing = queryOne("SELECT id FROM notifications WHERE message LIKE ? AND date(createdAt)=date('now')", [`%${item.name}%`]); if(!existing) execute("INSERT INTO notifications(id,userId,title,message,type,createdAt) VALUES(?,?,?,'Expiring Soon: '+?,?,datetime('now'))", [uuidv4(),req.user.id,'Expiry Alert',item.name+' is expiring within 30 days','warning']); });
    res.json(queryAll('SELECT * FROM notifications WHERE userId=? OR userId IS NULL ORDER BY createdAt DESC LIMIT 50', [req.user.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/notifications/read', authenticate, (req, res) => {
  execute('UPDATE notifications SET isRead=1 WHERE userId=?', [req.user.id]); res.json({ message: 'Marked read' });
});

// ============= AUDIT LOGS =============
app.get('/api/audit-logs', authenticate, (req, res) => {
  try {
    const limit = req.query.limit;
    let sql = 'SELECT al.*, u.name as userName FROM audit_logs al LEFT JOIN users u ON al.userId=u.id ORDER BY al.createdAt DESC';
    if (limit) sql += ` LIMIT ${parseInt(limit)}`;
    res.json(queryAll(sql));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= SYSTEM =============
app.get('/api/system/backup', authenticate, (req, res) => {
  try {
    const { getDb, saveDb } = require('./database');
    saveDb();
    res.json({ message: 'Database saved', path: 'data/meditrack.db' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/system/settings', authenticate, (req, res) => {
  const settings = queryAll('SELECT * FROM system_settings');
  const obj = {}; settings.forEach(s => obj[s.key] = s.value);
  res.json(obj);
});

app.post('/api/system/settings', authenticate, (req, res) => {
  try { const { key, value } = req.body; execute('INSERT OR REPLACE INTO system_settings(key,value) VALUES(?,?)', [key, value]); res.json({ message: 'Saved' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ============= STATIC FILES =============
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ============= START =============
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MediTrack server running on port ${PORT}`);
  });
}

module.exports = app;