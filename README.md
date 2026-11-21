# LivSportz — Full-Stack Real-Time Sports Platform with Clerk RBAC

LivSportz is a full-stack, real-time sports score and live commentary platform. It provides instant match score updates, live minute-by-minute text commentary, match status tracking, and production-ready role-based authorization using Clerk and PostgreSQL.

---

## Tech Stack

### Frontend
- **Framework:** React 19
- **Authentication SDK:** `@clerk/clerk-react`
- **Language:** TypeScript 5.8
- **Build Tool / Bundler:** Vite 6.2
- **Styling:** Tailwind CSS (utility classes with neo-brutalist styling)
- **Networking:** Native Fetch API & Native WebSocket client

### Backend
- **Runtime:** Node.js (v20+ ESM JavaScript)
- **Server Framework:** Express 5
- **Authentication & Verification:** `@clerk/express` & `svix` (webhooks)
- **Real-Time Communication:** WebSockets (`ws`)
- **Database & ORM:** PostgreSQL (Neon) with Drizzle ORM & Drizzle Kit migrations
- **Validation:** Zod
- **Security & Protection:** Arcjet (bot detection, rate limiting, and shield) & Helmet
- **CORS:** Configurable CORS middleware with credentials support

---

## Authentication & Authorization Model

Clerk manages **identity and authentication**, while our local PostgreSQL database manages **application roles and authorization**. Frontend role information is never trusted for security decisions.

### Application Roles
1. **`viewer` (Default):**
   - Automatically assigned to all new Clerk sign-ups.
   - Public read access to match listings, individual matches, scores, and commentary.
   - Connect to public match WebSocket feeds.
   - Cannot create matches, edit scores, or publish commentary.

2. **`scorer`:**
   - All viewer permissions.
   - Update match scores (`PATCH /matches/:id/score`).
   - Create live minute-by-minute commentary (`POST /matches/:id/commentary`).
   - Access to the interactive Scorer Desk UI.

3. **`admin`:**
   - All scorer permissions.
   - Create new matches (`POST /matches`).
   - List application users and inspect roles (`GET /admin/users`).
   - Promote / demote user roles (`PATCH /admin/users/:id/role`).
   - Access to the Admin Console UI.

---

## API Permission Matrix

| Endpoint | Method | Public / Role Required | Description |
| :--- | :---: | :---: | :--- |
| `/healthz`, `/ready` | `GET` | **Public** | Orchestrator health & database connectivity probes |
| `/matches` | `GET` | **Public** | List live, scheduled, and finished matches |
| `/matches/:id` | `GET` | **Public** | Get single match details |
| `/matches/:id/commentary` | `GET` | **Public** | Get live commentary timeline |
| `/ws` | `WS` | **Public** | Real-time score updates and commentary broadcasting |
| `/auth/me` | `GET` | **Authenticated** (`requireAuth`) | Retrieve verified Clerk user profile and local DB role |
| `/auth/sync` | `POST` | **Authenticated** (`requireAuth`) | Safe profile sync (never overwrites role) |
| `/matches/:id/score` | `PATCH` | **Scorer or Admin** | Update match scores in DB and broadcast via WS |
| `/matches/:id/commentary` | `POST` | **Scorer or Admin** | Insert commentary in DB and broadcast via WS |
| `/matches` | `POST` | **Admin Only** | Create a new match |
| `/admin/users` | `GET` | **Admin Only** | List application users and pagination |
| `/admin/users/:id/role` | `PATCH` | **Admin Only** | Modify a user's role (prevents self-demote and orphan lockout) |
| `/admin/bootstrap` | `POST` | **Authenticated + Secret** | One-time bootstrap mechanism to create first Admin |
| `/webhooks/clerk` | `POST` | **Svix Verified** | Optional Clerk webhook sync for user lifecycle events |

---

## Secure Admin Bootstrap Procedure

To create the initial administrator securely without hardcoded credentials or client escalation:

1. **Configure `ADMIN_BOOTSTRAP_SECRET` in `backend/.env`:**
   ```bash
   # Generate a 32-character random secret:
   ADMIN_BOOTSTRAP_SECRET="your-secure-random-bootstrap-secret"
   ```
2. **Sign up or Sign in** via the frontend or Clerk UI.
3. **Execute Bootstrap:**
   - **Via Frontend:** Click the **Admin Panel** tab -> *Admin Bootstrap*, enter the `ADMIN_BOOTSTRAP_SECRET`, and submit.
   - **Via REST API:**
     ```bash
     curl -X POST http://localhost:8000/admin/bootstrap \
       -H "Authorization: Bearer <your-clerk-jwt-token>" \
       -H "Content-Type: application/json" \
       -d '{"secret":"your-secure-random-bootstrap-secret"}'
     ```
4. **Permanent Lockout:** Once an administrator exists in the database, subsequent calls to `/admin/bootstrap` are rejected with HTTP 409 Conflict.

---

## Setup & Local Development

### 1. Prerequisites
- **Node.js:** v20+
- **npm:** v10+
- **PostgreSQL / Neon database**
- **Clerk Account:** Free account at [clerk.com](https://clerk.com)

### 2. Environment Variables

#### Backend (`backend/.env`):
```env
DATABASE_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/livsportz?sslmode=require"
PORT=8000
HOST=0.0.0.0
CLIENT_URL="http://localhost:3000"

# Clerk Keys
CLERK_SECRET_KEY="sk_test_..."
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Bootstrap Secret
ADMIN_BOOTSTRAP_SECRET="your-secure-random-bootstrap-secret"

# Arcjet Key (Optional in local development)
ARCJET_KEY="ajkey_..."
ARCJET_ENV=development
ARCJET_MODE=DRY_RUN
```

#### Frontend (`frontend/.env`):
```env
VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."
VITE_API_BASE_URL="http://localhost:8000"
VITE_WS_BASE_URL="ws://localhost:8000/ws"
```

### 3. Installation & Database Migration
```bash
# Install root, backend, and frontend dependencies
npm run install:all

# Run Drizzle database migrations
npm run db:migrate --prefix backend
```

### 4. Running the Application
```bash
# Start both frontend and backend concurrently
npm run dev

# Or run independently:
npm run dev:backend   # Express REST & WebSocket on http://localhost:8000
npm run dev:frontend  # Vite React on http://localhost:3000
```

---

## Automated Verification & Tests

Run the backend test suite:
```bash
npm run test:backend
```
Test coverage includes:
- **Authentication:** Token missing (401), malformed (401), valid verification, default viewer assignment, role preservation during sync.
- **Authorization:** Viewer blocked from scores & commentary (403), scorer allowed score & commentary (200/201), scorer blocked from match creation (403), admin full privileges, client body escalation rejection.
- **Admin Management:** User listing, role updates, self-demote prevention, last admin lockout prevention.
- **Admin Bootstrap:** Invalid secret rejection (401), valid promotion, repeat attempt rejection (409).
- **Public Access:** Match listing, single match, and commentary remaining publicly accessible.
- **WebSockets:** Realtime broadcast to subscribed clients.

Frontend verification:
```bash
npm run lint    # TypeScript type check (tsc --noEmit)
npm run build   # Production Vite bundle build
```
