# 🌿 MediTrack - Ayurvedic Hospital Inventory Management

**MediTrack** is a complete, working inventory management system for Ayurvedic hospitals. This lite version runs as a web application you can use immediately.

## ⚡ Quick Start (2 Minutes)

### 1. Install Node.js (one time)
Download from https://nodejs.org (v18 or higher). After install, **close and reopen** your terminal.

### 2. Open this folder in Command Prompt
```cmd
cd path\to\Meditrack
```

### 3. Install dependencies (one time)
```cmd
npm install
```
This takes 30-60 seconds. Just wait.

### 4. Start the server
```cmd
node server/index.js
```

That's it! Open **http://localhost:3001** in Chrome/Edge.

### 5. Login
- **Email**: `admin@meditrack.local`
- **Password**: `MediTrack@2024`

✅ The database **auto-seeds itself** on first run with 10 Ayurvedic medicines, batches with varied expiry dates, departments, suppliers, and demo accounts.

---

## 📋 One-Click Launcher (Windows)

Just double-click **`launch.bat`** - it runs everything for you: checks Node.js, installs deps, starts server, opens browser.

---

## 🎯 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Administrator** | admin@meditrack.local | MediTrack@2024 |
| Manager | manager@meditrack.local | manager123 |
| Staff | staff@meditrack.local | staff123 |
| Doctor | doctor@meditrack.local | doctor123 |

---

## ✨ Features

- ✅ **Dashboard** with real-time metrics and emergency readiness score
- ✅ **Inventory** with status (Healthy, Low, Critical, Out of Stock, Overstocked)
- ✅ **Medicine catalog** with Ayurvedic categories
- ✅ **Stock In** with batch tracking and expiry recording
- ✅ **Stock Out (FEFO)** - automatically picks earliest expiry batch first
- ✅ **Expiry management** - tracks days remaining and alerts
- ✅ **Suppliers** management
- ✅ **Purchase Orders** - create, approve, receive
- ✅ **Stock Transfers** for redistribution
- ✅ **AI Purchase Advisor** - recommends BUY NOW/BUY SOON/WAIT actions
- ✅ **AI Assistant** - ask questions in plain English
- ✅ **Emergency Readiness** score (0-100%)
- ✅ **Analytics** - ABC-VED matrix, consumption trends
- ✅ **Reports** - 7 types (inventory, stock-in, stock-out, expiry, wastage, purchase, audit)
- ✅ **User management** with roles (ADMIN/MANAGER/STAFF/DOCTOR)
- ✅ **Audit log** of all activity
- ✅ **Notifications** for low stock and expiry

---

## 🏥 What's Pre-loaded

The auto-seed creates this real data:

**10 Ayurvedic Medicines:**
- Triphala Churna, Trikatu Churna, Sitopaladi Churna
- Chyavanprash Vati
- Mahanarayan Taila, Karpooradi Taila
- Dashamoola Kashaya
- Ashwagandha Root
- Surgical Gloves, Bandage Roll

**Including scenarios for:**
- 🔴 Critical stock (Sitopaladi, Karpooradi, Gloves)
- ⏰ Expiring soon (40-60 days)
- 🗑️ Expired batches
- ✅ Healthy stock
- 🔵 Overstocked items
- 📦 Multiple batches per medicine (FEFO testing)

---

## 🛑 To Stop the Server

Press **Ctrl+C** in the terminal window.

---

## 🔄 To Reset the Database

Stop the server, delete `data/meditrack.db`, then start the server again. It will auto-seed fresh demo data.

---

## 📁 Project Structure

```
Meditrack/
├── server/
│   ├── index.js       ← Main API server (everything in one file)
│   └── database.js    ← SQLite database with schema
├── frontend/
│   └── index.html     ← Single-page app
├── data/
│   └── meditrack.db   ← Created automatically on first run
├── node_modules/      ← Created by npm install
├── package.json       ← Dependencies
└── launch.bat         ← Windows one-click launcher
```

---

## 🐛 Troubleshooting

**"Cannot find module" errors:**
```cmd
npm install
```

**"Port 3001 already in use":**
Close other programs using port 3001, or set a different port:
```cmd
set MEDITRACK_PORT=3002
node server/index.js
```

**Browser shows old data after reset:**
Delete `data/meditrack.db` and restart. Also clear browser localStorage (F12 → Application → Clear storage) or use Incognito mode.

**Login fails with correct credentials:**
Make sure the server actually started (you should see "MediTrack v1.0 - READY" in the terminal). Try Incognito/Private browsing in your browser.

---

## 🏗️ Tech Stack

- Node.js + Express
- SQLite (via sql.js, pure JavaScript)
- JWT authentication
- bcrypt password hashing
- Vanilla JavaScript frontend (no build step)

---

## License

MIT