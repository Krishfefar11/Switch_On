# SwitchOn — Feature Flag Management Platform

[![Live API](https://img.shields.io/badge/API-Live%20on%20Render-46E3B7?style=flat-square&logo=render)](https://switchon-api2.onrender.com)
[![Demo App](https://img.shields.io/badge/Demo%20App-Live%20on%20Render-46E3B7?style=flat-square&logo=render)](https://switchon-demo2.onrender.com)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://mongodb.com/atlas)

A production-grade, multi-tenant feature flag control plane. Ship features safely with real-time flag delivery, percentage rollouts, targeting rules, RBAC, and a full JavaScript SDK — all on a free-tier stack.

---

## 🌐 Live URLs

| Service | URL | Platform |
|---|---|---|
| **REST API** | https://switchon-api2.onrender.com | Render (Docker) |
| **Demo Store (VOLT)** | https://switchon-demo2.onrender.com | Render (Docker) |
| **Dashboard** | https://switchon-dashboard.vercel.app | Vercel |

**Demo credentials:** `admin@demo.com` / `Admin1234!`

> ⚠️ Render free tier sleeps after 15 min of inactivity. First request may take ~30s to wake up.

---

## 🏗️ Architecture

```
┌──────────────────┐     JWT + REST      ┌─────────────────────┐
│  React Dashboard │ ──────────────────► │                     │
│  (feature-flag-ui)│     SSE stream      │   Feature Flag API  │
│                  │ ◄────────────────── │  (feature-flag-api) │
└──────────────────┘                     │                     │
                                         │   Node/Express      │
┌──────────────────┐     SDK Key + REST  │   MongoDB Atlas     │
│   VOLT Demo Store│ ──────────────────► │   SSE Engine        │
│ (feature-flag-demo)│   SSE stream      │                     │
│  Express Proxy   │ ◄────────────────── └─────────────────────┘
│  + Vanilla JS    │
└──────────────────┘

┌──────────────────┐
│  switchon-js-sdk │  npm package — ESM, CJS, CDN, TypeScript
└──────────────────┘
```

**Data hierarchy:** Organization → Project → SDK Keys → Feature Flags

---

## ✨ Features

### Core
- **Real-time flag delivery** via Server-Sent Events — FLAG_SNAPSHOT on connect, delta push on change
- **Evaluation engine** — Targeting rules → Rollout % → Default value, with reason codes
- **Deterministic bucketing** — MurmurHash(userId + flagName) % 100 for consistent user assignment
- **Multi-tenant isolation** — Org > Project > SDK Key scoping; cross-tenant data leaks impossible
- **RBAC** — Admin / Developer / Viewer roles enforced on every mutation endpoint

### Auth
- JWT access tokens (15-min) + HttpOnly refresh tokens (7-day rotation)
- Invite-based team membership with email verification
- Password reset via Resend email API

### Flag Management
- Create / edit / archive / delete flags per environment
- Bulk operations (enable, disable, archive multiple flags at once)
- Environment promotion (copy flag config from staging → production)
- Stale flag detection — flags untouched for 30+ days flagged automatically
- Audit log — every flag change recorded with actor, timestamp, diff

### SDK & Integration
- **JavaScript SDK** (`switchon-js-sdk`) — 4 build targets: ESM, CJS, CDN, TypeScript
- Evaluate a single flag: `client.isEnabled('flag-name', { userId })`
- Batch evaluate all flags in one request
- Webhook system — POST to your endpoint on every flag change

### Analytics
- Per-flag evaluation counts, true/false breakdown, trend charts
- Per-environment analytics scoped to your project

---

## 🧩 Services

### `feature-flag-api`
REST API + SSE engine. All business logic lives here.

```
Node.js 20 · Express · MongoDB/Mongoose · JWT · bcrypt · SSE · Resend
```

### `feature-flag-ui`
React dashboard for managing flags, users, analytics, audit logs, settings.

```
React 18 · Vite · Axios · Framer Motion · Recharts
```

### `feature-flag-demo`
VOLT — a demo e-commerce store with 12 live feature flags wired up. Shows real-time SSE in action.

```
Vanilla JS · Node.js Express Proxy (injects SDK key server-side)
```

### `switchon-js-sdk`
Installable JavaScript SDK for consuming flag evaluations in any app.

```
Rollup · ESM · CJS · IIFE (CDN) · TypeScript declarations
```

---

## ⚙️ Local Development

### Prerequisites
- Node.js v18+
- MongoDB (local on `localhost:27017` or Atlas)

### 1. API
```bash
cd feature-flag-api
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, RESEND_API_KEY
npm install
npm run dev
# → http://localhost:5005
```

### 2. Dashboard
```bash
cd feature-flag-ui
cp .env.example .env   # VITE_API_URL=http://localhost:5005
npm install
npm run dev
# → http://localhost:5173
```

### 3. Demo Store
```bash
cd feature-flag-demo/proxy
cp .env.example .env   # API_URL=http://localhost:5005, CONSUMER_API_KEY=<your-sdk-key>
npm install
npm start
# → http://localhost:3002
```

---

## 🔐 Environment Variables

### `feature-flag-api/.env`
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `RESEND_API_KEY` | API key from resend.com (email) |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist |
| `PORT` | Server port (default 5005) |

### `feature-flag-ui/.env`
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the API (no trailing slash) |
| `VITE_DEMO_URL` | Base URL of the demo store |

### `feature-flag-demo/proxy/.env`
| Variable | Description |
|---|---|
| `API_URL` | Base URL of the API |
| `CONSUMER_API_KEY` | SDK key from your project settings |
| `PORT` | Proxy port (default 3002) |
| `FLAG_ENVIRONMENT` | `development` or `production` |

---

## 🚀 Deployment

**Free-tier stack:** Render (API + Demo) · Vercel (Dashboard) · MongoDB Atlas M0

### API — Render
1. New Web Service → connect GitHub repo
2. Root Directory: `feature-flag-api`
3. Environment: **Docker**
4. Add all env vars from the table above
5. Deploy

### Demo Store — Render
1. New Web Service → connect GitHub repo
2. Root Directory: `feature-flag-demo` *(not `feature-flag-demo/proxy`)*
3. Environment: **Docker**
4. Add `API_URL`, `CONSUMER_API_KEY`, `PORT=10000`
5. Deploy

### Dashboard — Vercel
1. Import GitHub repo → Vercel
2. Root Directory: `feature-flag-ui`
3. Framework: **Vite**
4. Add `VITE_API_URL=https://switchon-api2.onrender.com`
5. Deploy — `vercel.json` handles SPA routing automatically

### Seed Production Database
```bash
cd feature-flag-api
MONGO_URI="mongodb+srv://..." node seed.js
```
Creates `admin@demo.com` + 12 demo flags.

---

## 🔒 Security Highlights

- Non-root Docker containers (`appuser`)
- `.env` files stripped at Docker build time
- HttpOnly cookies for refresh tokens (XSS-proof)
- SDK keys scoped to project — zero cross-tenant data access
- CORS restricted to explicit origin whitelist
- All flag mutations require authenticated session + role check

---

## 📁 Project Structure

```
switch-on/
├── feature-flag-api/          # REST API + SSE engine
│   ├── src/
│   │   ├── controllers/       # Auth, flags, analytics, users, orgs, webhooks
│   │   ├── middleware/        # consumerAuth, requireRole, rateLimit
│   │   ├── models/            # 10 Mongoose schemas
│   │   └── routes/            # All route definitions
│   ├── Dockerfile
│   └── server.js
│
├── feature-flag-ui/           # React dashboard
│   ├── src/
│   │   ├── pages/             # Dashboard, Flags, Analytics, Audit, Settings, Users
│   │   ├── components/        # Shared UI components
│   │   └── api/               # Axios instance + API helpers
│   ├── vercel.json
│   └── vite.config.js
│
├── feature-flag-demo/         # VOLT demo store
│   ├── proxy/                 # Express proxy server
│   │   └── server.js
│   ├── public/                # Static HTML/CSS/JS (VOLT store UI)
│   └── Dockerfile             # At parent level — copies both proxy/ + public/
│
└── switchon-js-sdk/           # JavaScript SDK
    ├── src/
    └── rollup.config.js
```

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

*Built by [Krish Patel](https://github.com/Krishfefar11)*
