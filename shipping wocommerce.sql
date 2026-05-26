# 🧠 SynCloud Gérant — Feature & Reports Brainstorm

> **Current State Audit**: The app has 4 tabs — Dashboard (KPIs + treasury + alerts), Achats AI (OCR scanner + purchase entry), Dépenses (categorized outflows + photo proofs), and Settings. Plus a floating Voice Assistant widget.

---

## 🔴 Tier 1 — High-Impact, Must-Have Features

### 📊 1. Sales Analytics & Revenue Charts
**What**: Interactive line/bar charts showing daily, weekly, monthly revenue trends with comparison overlays (this week vs. last week, this month vs. last month).
- Mini sparkline on dashboard card showing 7-day trend
- Dedicated full-screen report with date range picker
- Breakdown by: product category, brand, client, driver
- **Data source**: Existing `analytics.ts` + `profit-report.ts` server actions

### 💰 2. Profit Margin Report (Mobile)
**What**: Product-level and category-level profit analysis — which products earn the most margin, which ones are loss leaders.
- Sortable list: Revenue, Cost, Margin %, Margin DA
- Color-coded margin health (green > 20%, yellow 10-20%, red < 10%)
- Top 10 most profitable products vs. bottom 10
- **Data source**: Existing `profit-report.ts` action — already built on web

### 🧾 3. Supplier Payments & Ledger
**What**: Track how much you owe each supplier, record payments against open purchase orders, and view the full supplier balance ledger.
- Outstanding supplier balances list
- Quick "Pay Supplier" action with photo proof of wire/cheque
- Payment history timeline per supplier
- **Data source**: `suppliers.ts` + `payments.ts` server actions

### 📋 4. Client Debt Collection Manager
**What**: Upgrade the current "top debtors" list into a full debt management screen with action capabilities.
- Full client debt aging report (0-30d, 30-60d, 60-90d, 90d+)
- One-tap "Send WhatsApp Payment Reminder" to client
- Record client payment received (cash/cheque/bank transfer) with photo proof
- Mark debts as "promised" with follow-up date
- **Data source**: `aging-report.ts` + `customers.ts` + `whatsapp.ts` actions

### 🔔 5. Smart Push Notifications & Alerts
**What**: Proactive alerts that wake the manager without opening the app.
- Daily morning summary notification ("Yesterday: 450K DA revenue, 3 new debts")
- Stock rupture alerts when items hit zero
- Large expense alerts (> threshold)
- Driver GPS anomaly alerts (vehicle stopped > 1 hour during work hours)
- Weekly P&L digest every Sunday evening
- **Implementation**: Expo push notifications + scheduled background tasks

---

## 🟡 Tier 2 — High-Value Analytical Features

### 📈 6. Cash Flow Forecast
**What**: AI-powered cash flow projection showing expected inflows (from receivables) vs. outflows (supplier payments, rent, salaries) for the next 7/14/30 days.
- Visual timeline graph
- "Danger zone" highlighting when cash balance may go negative
- Voice assistant integration: "ياخو كيفاه السيولة هاد الشهر؟"
- **Data source**: `ai-forecast.ts` + treasury data

### 🏷️ 7. Daily Close / End-of-Day Report
**What**: A structured end-of-day cash reconciliation screen.
- Expected cash in drawer vs. counted cash
- Discrepancy flagging with mandatory explanation
- Auto-generated PDF summary for archiving
- Historical daily close reports viewer
- **Data source**: `daily-close.ts` action — already exists on web

### 🚚 8. Driver Performance Monitor
**What**: Real-time and historical oversight of all delivery drivers and commercial reps.
- Live GPS locations on a mini-map (current positions of all drivers)
- Daily stats per driver: clients visited, BLs created, revenue generated, returns
- Commission leaderboard ranking
- Route efficiency score (planned vs. actual stops)
- **Data source**: `delivery.ts` + `commissions.ts` + GPS tracking data

### 📦 9. Inventory Health Dashboard
**What**: Go beyond the current "low stock" alerts with a comprehensive inventory intelligence screen.
- Total inventory value (at cost price)
- Days of stock remaining per product (based on avg daily sales velocity)
- Dead stock identifier (products with zero movement in 30+ days)
- Reorder suggestions with quantities based on sales velocity
- Category-level stock distribution pie chart
- **Data source**: `products.ts` + `reorder.ts` + `inventory-audit.ts`

### 🔄 10. Stock Transfer Manager
**What**: If managing multiple stores/warehouses, allow the manager to initiate and track stock transfers between locations.
- Select source → destination store
- Pick products and quantities
- Transfer status tracking (pending, in-transit, received)
- **Data source**: `transfers.ts` action

---

## 🟢 Tier 3 — Compliance & Financial Governance

### 📑 11. G50 Tax Declaration Helper
**What**: Algerian tax compliance screen helping the manager prepare monthly G50 declarations.
- Auto-calculated TVA collected vs. TVA deductible
- Net tax liability summary
- Export-ready PDF matching the DGI (Direction Générale des Impôts) format
- Historical declarations archive
- **Data source**: `g50.ts` action — already built on web!

### 🧮 12. G12 Annual Summary
**What**: Year-end fiscal summary for the annual tax declaration (G12 / Bilan Fiscal).
- Annual revenue, expenses, net profit
- Fixed asset depreciation summary
- Export-ready for the accountant
- **Data source**: `g12.ts` action

### 🏦 13. Cheque Management
**What**: Track received and issued cheques with maturity dates.
- Cheque register (date, number, amount, bank, maturity date, status)
- Upcoming cheque maturity calendar view
- Alert when a cheque is approaching its deposit date
- Bounced cheque tracking with client flags
- **Data source**: `cheques.ts` action

### 📔 14. Accounting Journal Viewer
**What**: Browse accounting journal entries from the mobile for quick auditing.
- Filter by date range, journal type (sales, purchases, cash)
- Searchable ledger entries
- Quick export to CSV/PDF
- **Data source**: `journals.ts` + `ledger.ts` actions

---

## 🔵 Tier 4 — AI-Powered Intelligence

### 🤖 15. AI Business Health Score
**What**: A single 0-100 composite score reflecting overall business health, calculated from multiple weighted factors.
- Revenue trend (growing/declining)
- Debt ratio (receivables vs. revenue)
- Inventory turnover rate
- Expense efficiency (overhead as % of revenue)
- Cash coverage days
- Color-coded gauge with animated transitions
- AI-generated natural language summary in Darija

### 📊 16. AI Anomaly Detector
**What**: Automatically flag unusual business activity.
- Unusual sales spike or drop compared to historical patterns
- Expense category that suddenly jumped
- Client whose ordering pattern changed significantly
- Products selling faster than usual (potential shortage)
- Weekly "anomalies detected" report card

### 💬 17. Enhanced Voice Commands
**What**: Extend the voice assistant beyond reports to actual actions.
- "سجلي مصروف كرا 35000 دينار" → auto-fill expense form
- "شحال دار [driver name] اليوم؟" → driver performance lookup
- "وريني المخزون اللي راح يخلص" → navigate to reorder screen
- "ابعت رسالة تذكير لـ [client name]" → trigger WhatsApp reminder
- Natural language query on any metric

### 📉 18. Predictive Stock Alerts
**What**: AI predicts which products will run out in the next 3-7 days based on current sales velocity, and auto-generates a suggested purchase order.
- "These 8 products will be out of stock by Thursday"
- One-tap: "Generate Purchase Order" with pre-filled quantities
- Seasonal adjustment awareness

---

## ⚪ Tier 5 — UX & Operational Upgrades

### 🌙 19. Customizable Dashboard Widgets
**What**: Let the manager reorder, show/hide, and resize dashboard cards.
- Drag-to-reorder widget cards
- Toggle visibility of sections they don't need
- Pin favorite metric to always show at top
- Persist layout in AsyncStorage

### 📅 20. Business Calendar
**What**: Unified calendar showing all important business events.
- Cheque maturity dates
- Supplier payment due dates
- Scheduled deliveries
- Tax declaration deadlines (G50 monthly, G12 annual)
- Daily close reminders

### 📤 21. Export & Share Reports
**What**: One-tap export of any report screen as a professional PDF.
- Share via WhatsApp, email, or save locally
- Branded with company logo and header
- Date-stamped with generation metadata
- Useful for sending to accountants, partners, or banks

### 👥 22. Employee / User Management
**What**: View and manage app users directly from mobile.
- List all users (drivers, cashiers, managers)
- Activate / deactivate accounts
- Reset passwords
- View last login and device info
- **Data source**: `get-tenant-users.ts` + `update-user.ts`

### 🔐 23. Biometric Lock
**What**: Require fingerprint/Face ID to open the app after being in background.
- Optional toggle in Settings
- Protects sensitive financial data on shared devices
- Uses `expo-local-authentication`

### 🌐 24. Multi-Store Switcher
**What**: If the tenant has multiple stores, allow the manager to switch context and view data for each store independently.
- Store selector in the header
- All KPIs and reports filter by selected store
- Aggregate "All Stores" view for global overview
- **Data source**: `stores.ts` + `switch-store.ts`

### 🧾 25. Invoice Viewer & Validator
**What**: Browse recent sales invoices, validate them, and send copies to clients.
- Invoice list with status filters (draft, sent, paid, overdue)
- Quick share via WhatsApp
- Mark as paid / partially paid
- **Data source**: `invoices.ts` + `send-document.ts`

### 📊 26. Promotional Campaign Tracker
**What**: View active promotions and their performance impact.
- Which promotions are currently running
- Revenue uplift measurement
- Products under promotion with discount percentages
- **Data source**: `promotions.ts`

### 🏪 27. Spoilage & Loss Tracker
**What**: Record damaged, expired, or lost inventory with photo evidence.
- Category selection (expired, damaged, theft, other)
- Mandatory photo proof
- Monthly spoilage cost report
- **Data source**: `spoilage.ts`

### 📱 28. Offline Mode Enhancement
**What**: Enable full offline operation with background sync.
- Queue expense entries, purchase orders when offline
- Visual indicator showing sync status
- Automatic retry when connectivity returns
- Conflict resolution for concurrent edits

### 🔗 29. Quick Action Shortcuts (Home Screen Widget)
**What**: Android/iOS home screen widgets for the most common manager actions.
- "Today's Revenue" live widget
- "Add Expense" shortcut
- "Cash Balance" glanceable widget
- Uses Expo widgets or native module bridges

### 📞 30. Client Quick Contact
**What**: One-tap calling or WhatsApp messaging to any client directly from the debtor list.
- Long-press on client name → call / WhatsApp / SMS options
- Pre-filled payment reminder message templates
- Call log integration

---

## 🗺️ Recommended Implementation Roadmap

| Phase | Features | Effort |
|-------|----------|--------|
| **Phase A** (Week 1-2) | Sales Charts (#1), Profit Report (#2), Daily Close (#7), Client Debt Manager (#4) | Medium |
| **Phase B** (Week 3-4) | Supplier Payments (#3), Driver Monitor (#8), Inventory Dashboard (#9) | Medium-High |
| **Phase C** (Week 5-6) | G50 Tax (#11), Cheques (#13), Invoice Viewer (#25), Export PDFs (#21) | Medium |
| **Phase D** (Week 7-8) | AI Health Score (#15), Enhanced Voice (#17), Predictive Stock (#18), Notifications (#5) | High |
| **Phase E** (Ongoing) | Cash Flow Forecast (#6), Calendar (#20), Offline (#28), Biometrics (#23) | Variable |

---

## 💡 Key Design Principles

1. **Mobile-First Thinking**: Every screen must be instantly useful within 3 seconds of opening. No complex navigation trees.
2. **Voice-First for Reports**: Any analytical report should be speakable by the voice assistant in Darija/Arabic/French.
3. **Photo-Proof Everywhere**: Every financial transaction should support visual justification.
4. **Algerian Context**: Tax compliance (G50, G12), Dinar formatting, Arabic/Darija language, local supplier terminology.
5. **Offline Resilience**: A manager visiting stores in areas with poor connectivity needs queued operations.
