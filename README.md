# SYNCLOUDPOS — Point of Sale System

A modern, full-featured Point of Sale system for Algerian businesses.
Multi-store, multi-user, with invoicing, analytics, and subscriptions.

---

## 🚀 Quick Install (Local)

### Requirements
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / Mac / Linux)
- That's it — no Node.js, no PostgreSQL needed separately

### Windows
1. Download or clone this repository
2. Double-click **`install.bat`**
3. Open **http://localhost:3000** in your browser

### Mac / Linux
```bash
chmod +x install.sh
./install.sh
```

### First Time Setup
- Click **Register** to create your store and admin account
- Login with your credentials
- You're ready to use SYNCLOUDPOS!

---

## 🔧 Daily Usage

| Action | Command |
|--------|---------|
| Start the app | `docker compose up -d` |
| Stop the app | `docker compose down` |
| View logs | `docker compose logs -f app` |
| Update to new version | `git pull && docker compose up -d --build` |
| Backup database | `docker compose exec db pg_dump -U syncloud syncloudpos > backup.sql` |

---

## ⚙️ Optional Configuration

Edit `.env.local` to enable extra features:

| Feature | What to add |
|---------|------------|
| Google Login | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| WhatsApp OTP | `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` |
| AI Assistant | `GEMINI_API_KEY` |

After editing `.env.local`, restart with:
```bash
docker compose down && docker compose up -d
```

---

## 🌐 Cloud Version

Your SaaS version is live at: **https://chirpedbeo.online**

---

## 📦 Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Actions, Prisma ORM
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Auth**: NextAuth v5 (Credentials + Google OAuth)
