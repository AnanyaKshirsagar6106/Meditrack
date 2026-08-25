# MediTrack User Guide

## Getting Started

1. Make sure Node.js is installed
2. Run `npm install` to install dependencies
3. Run `node server/seed.js` to create demo data
4. Run `node server/index.js` to start the server
5. Open http://localhost:3001 in your browser
6. Login with: `admin@meditrack.local` / `MediTrack@2024`

## Navigation

The sidebar provides access to all features:

- **Dashboard** - Overview with key metrics and emergency readiness
- **Inventory** - View all stock items with status
- **Medicines** - Manage medicine catalog
- **Stock In** - Receive new inventory
- **Stock Out** - Issue stock (FEFO - earliest expiry first)
- **Expiry** - Track expiring batches
- **Suppliers** - Manage vendors
- **Purchase Orders** - Create and manage POs
- **Transfers** - Transfer stock between departments
- **AI Advisor** - Smart purchase recommendations
- **Analytics** - ABC-VED analysis and consumption trends
- **Reports** - Generate various reports
- **Alerts** - View notifications
- **Users** - Manage user accounts
- **Audit** - View activity log

## Common Workflows

### Receiving Stock
Stock In → Select Medicine → Enter Batch# → Quantity → Expiry → Confirm

### Issuing Stock  
Stock Out → Select Medicine → Quantity → Department → Confirm (FEFO auto-applies)

### Creating Purchase Order
Purchase Orders → New PO → Select Supplier → Add Items → Create → Approve → Receive