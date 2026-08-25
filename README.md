# 🌿 MediTrack - Ayurvedic Hospital Inventory Management

**MediTrack** is a professional desktop application for managing inventory, procurement, analytics and decision-support in an Ayurvedic hospital. It helps reduce manual work, stock errors, medicine expiry, unnecessary purchasing, and emergency shortages.

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)

### One-Time Setup
```
npm install
node server/seed.js
```

### Start MediTrack
```
node server/index.js
```

Open your browser to: **http://localhost:3001**

### Demo Login
| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@meditrack.local | MediTrack@2024 |
| Manager | manager@meditrack.local | manager123 |
| Staff | staff@meditrack.local | staff123 |
| Doctor | doctor@meditrack.local | doctor123 |

## ✨ Features

- **📊 Dashboard** - Real-time inventory overview with key metrics
- **📦 Inventory Management** - Complete item tracking with categories, batches and locations
- **📥 Stock In** - Record incoming inventory with batch tracking
- **📤 Stock Out** - Issue stock with **FEFO** (First Expiry, First Out) recommendation
- **⏰ Expiry Management** - Track expiring batches, generate alerts
- **🏭 Supplier Management** - Manage suppliers, pricing and performance
- **📋 Purchase Orders** - Create, approve and receive purchase orders
- **🔄 Stock Transfers** - Redistribute stock between departments
- **🤖 AI Purchase Advisor** - Smart recommendations for purchasing decisions
- **📈 Analytics** - ABC-VED matrix, consumption trends, inventory valuation
- **🚨 Emergency Readiness** - Automated emergency preparedness scoring
- **💬 AI Assistant** - Natural language queries about inventory
- **📄 Reports** - Generate reports for inventory, stock movements, expiry, wastage
- **👥 User Management** - Role-based access control
- **📝 Audit Log** - Complete activity tracking
- **🗑️ Wastage Tracking** - Record expired, damaged or lost inventory

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend      │  HTML/CSS/JS SPA
│   (Browser)     │
└────────┬────────┘
         │ HTTP / REST API
┌────────▼────────┐
│   Express API   │  Node.js Backend
│   (server/)     │
└────────┬────────┘
         │
┌────────▼────────┐
│   SQLite DB     │  sql.js (in-process)
│   (data/)       │
└─────────────────┘
```

## 🗄️ Database

SQLite database stored locally at `data/meditrack.db`. Key tables:

- `users` - User accounts and roles
- `medicines` - Medicine/item master data
- `categories` - Medicine categories (Churna, Vati, Taila, etc.)
- `batches` - Inventory batches with expiry tracking
- `inventory` - Current stock levels
- `suppliers` - Vendor management
- `purchase_orders` - Purchase order management
- `departments` - Hospital departments
- `stock_in_transactions` - Stock receipt records
- `stock_out_transactions` - Stock issue records
- `stock_transfers` - Inter-department transfers
- `wastage` - Expired/damaged stock records
- `audit_logs` - Complete activity trail
- `alerts` - System notifications
- `forecasts` - AI demand predictions

## � Configuring

Set these environment variables (optional):

| Variable | Default | Description |
|----------|---------|-------------|
| `MEDITRACK_PORT` | `3001` | API server port |
| `MEDITRACK_DATA` | `./data` | Database directory |
| `JWT_SECRET` | `meditrack-secret-2024` | JWT signing key |

## 📦 Builing Windows Installer

```
npm run package
```

This creates `MediTrack-Setup.exe` in the `release/` folder using electron-builder.

## 🧪 Running Tests

```
node server/seed.js   # Reset database with demo data
```

## 📋 Demo Scenarios

1. **Login** - Use admin@meditrack.local / MediTrack@2024
2. **Dashboard** - See inventory summary and emergency readiness
3. **Inventory** - Browse all items with stock levels
4. **Stock In** - Add new stock with batch details
5. **Stock Out** - Issue stock - FEFO automatically selects earliest expiry batch
6. **AI Advisor** - View purchase recommendations
7. **Emergency** - Check emergency readiness score
8. **ABC-VED** - View analytics matrix
9. **Reports** - Generate inventory report
10. **Audit** - View activity log

## 🔒 Security

- Passwords hashed with bcrypt
- JWT-based authentication
- Role-based access control (ADMIN, MANAGER, STAFF, DOCTOR)
- Audit logging for all critical actions
- Input validation on all endpoints

## 🤖 AI Features

MediTrack includes practical AI/ML features:

- **Purchase Advisor** - Analyzes current stock, consumption patterns, pending orders and expiry risk to recommend purchasing actions
- **Emergency Readiness** - Calculates emergency readiness score based on inventory levels of critical items
- **Forecasting** - Moving average-based demand forecasting with confidence indicators
- ** Assistant** - Natural language interface for inventory queries

## 📱 Future Integrations

- Barcode/QR code scanning
- IoT sensor monitoring (temperature, humidity)
- Mobile application
- Hospital ERP integration
- Automated purchase order generation

## License

MIT