const jwt = require('jsonwebtoken');
const { getDb } = require('./database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.MEDITRACK_JWT_SECRET || 'meditrack-demo-secret-change-in-production';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function logAudit(userId, action, entity, entityId, details, oldValue, newValue) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_logs (id, userId, action, entity, entityId, details, oldValue, newValue, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(uuidv4(), userId, action, entity, entityId, details || null, oldValue || null, newValue || null);
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

module.exports = { generateToken, authenticate, requireRole, logAudit, JWT_SECRET };