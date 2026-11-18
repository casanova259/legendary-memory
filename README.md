# LivSportz — Full-Stack Real-Time Sports Tracking Monorepo

LivSportz is a full-stack, real-time sports score and live commentary platform. It provides instant match score updates, live minute-by-minute text commentary, and match status tracking powered by WebSockets, PostgreSQL, and Express.

---

## Tech Stack

### Frontend
- **Framework:** React 19
- **Language:** TypeScript 5.8
- **Build Tool / Bundler:** Vite 6.2
- **Styling:** Tailwind CSS (utility classes with custom styling)
- **Networking:** Native Fetch API & Native WebSocket client

### Backend
- **Runtime:** Node.js (v20+ ESM)
- **Server Framework:** Express 5
- **Real-Time Communication:** WebSockets (`ws`)
- **Database & ORM:** PostgreSQL / Neon with Drizzle ORM & Drizzle Kit
- **Validation:** Zod
- **Security & Protection:** Arcjet (bot detection, rate limiting, and shield)
- **CORS:** Configurable CORS middleware with credentials support

---

## Folder Structure

```
LivSportz/
├── backend/                       # Backend Node.js service
│   ├── drizzle/                   # Drizzle migration files and SQL snapshots
│   ├── src/
│   │   ├── data/                  # Static / mock sports data
│   │   ├── db/                    # PostgreSQL connection (Drizzle ORM) & table schema
│   │   ├── routes/                # Express API routes (matches, commentary)
│   │   ├── seed/                  # Database seeding scripts
│   │   ├── validation/            # Zod validation schemas
│   │   ├── ws/                    # WebSocket server and subscription management
│   │   ├── arcjet.js              # Arcjet security configuration & middleware
│   │   └── index.js               # Express application entry point
│   ├── .env                       # Backend local secrets (git-ignored)
│   ├── .env.example               # Backend environment variables template
│   ├── .gitignore                 # Backend-specific ignore rules
│   ├── drizzle.config.js          # Drizzle Kit configuration
│   └── package.json               # Backend dependencies and scripts
│
├── frontend/                      # Frontend Vite + React application
│   ├── components/                # React components (LiveFeed, MatchCard, StatusIndicator)
│   ├── hooks/                     # Custom hooks (useMatchData, useWebSocket)
│   ├── services/                  # API client and WebSocket service helpers
│   ├── App.tsx                    # Main dashboard view
│   ├── constants.ts               # Environment configuration & constants
│   ├── index.html                 # HTML entry point
│   ├── index.tsx                  # React DOM mount point
│   ├── types.ts                   # TypeScript interfaces and type definitions
│   ├── vite.config.ts             # Vite build & dev server config
│   ├── tsconfig.json              # TypeScript compiler settings
│   ├── .env                       # Frontend local configuration (git-ignored)
│   ├── .env.example               # Frontend environment variables template
│   ├── .gitignore                 # Frontend-specific ignore rules
│   └── package.json               # Frontend dependencies and scripts
│
├── .env.example                   # Monorepo environment reference
├── .gitignore                     # Monorepo root ignore rules
├── package.json                   # Root monorepo script orchestrator
└── README.md                      # Complete monorepo documentation
```

---

## Prerequisites

- **Node.js**: `v20.0.0` or higher (Node 22 recommended)
- **npm**: `v10.0.0` or higher
- **PostgreSQL Database**: PostgreSQL 14+ or a cloud instance such as [Neon](https://neon.tech/)

---

## Environment Variable Setup

Environment variables are partitioned cleanly between `backend/.env` and `frontend/.env`.

> [!IMPORTANT]
> Never put backend database credentials or API secrets in `frontend/.env`.

### 1. Backend (`backend/.env`)

Copy the example file and update with your credentials:
```bash
cp backend/.env.example backend/.env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host/dbname?sslmode=require` |
| `PORT` | Backend HTTP & WS port | `8000` |
| `HOST` | Backend bind host | `0.0.0.0` |
| `ARCJET_KEY` | Arcjet security key | `ajkey_...` (obtain at https://launch.arcjet.com) |
| `ARCJET_ENV` | Arcjet environment | `development` |
| `ARCJET_MODE` | Arcjet evaluation mode | `DRY_RUN` or `LIVE` |
| `CLIENT_URL` | Frontend origin for CORS | `http://localhost:3000` |

### 2. Frontend (`frontend/.env`)

Copy the example file:
```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Backend REST API endpoint | `http://localhost:8000` |
| `VITE_WS_BASE_URL` | Backend WebSocket endpoint | `ws://localhost:8000/ws` |
| `VITE_DEV_PORT` | Local dev server port | `3000` |
| `VITE_DEV_HOST` | Local dev server host | `0.0.0.0` |

---

## Installation

To install all dependencies across the monorepo root, frontend, and backend with a single command:

```bash
npm run install:all
```

Or install them independently:
```bash
# Root orchestrator
npm install

# Frontend
cd frontend && npm install && cd ..

# Backend
cd backend && npm install && cd ..
```

---

## Development Scripts

Run all commands directly from the monorepo root:

### 1. Start Both Frontend & Backend (Recommended)
```bash
npm run dev
```
Starts backend (`http://localhost:8000`) and frontend (`http://localhost:3000`) concurrently in watch mode.

### 2. Start Frontend Only
```bash
npm run dev:frontend
```
Launches Vite development server on `http://localhost:3000`.

### 3. Start Backend Only
```bash
npm run dev:backend
```
Launches Node.js with `--watch` on `http://localhost:8000`.

### 4. Build Frontend for Production
```bash
npm run build
```
Typechecks and compiles production assets into `frontend/dist/`.

### 5. Typecheck & Lint
```bash
npm run lint
```
Runs TypeScript compiler diagnostics (`tsc --noEmit`) to verify type safety across the frontend.

### 6. Run Automated Tests
```bash
npm test
```
Runs the automated test suite across all API routes, validation rules, security policies, and WebSocket lifecycles.

---

## Database Management (Backend)

Run database migrations or studio tools from the `backend/` directory:

```bash
cd backend

# Generate migrations from schema
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio UI
npm run db:studio

# Seed sample match data
npm run seed
```

---

## API & WebSocket Architecture

### REST Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API status and version info |
| `GET` | `/healthz` | Process liveness probe (200 OK) |
| `GET` | `/ready` | Database readiness probe (`SELECT 1`) |
| `GET` | `/matches?limit=50` | Retrieve recent matches |
| `GET` | `/matches/:id` | Retrieve a single match by ID (404 if not found) |
| `POST` | `/matches` | Create a new match (broadcasts `match_created`) |
| `PATCH`| `/matches/:id/score` | Update match score (validates non-negative integers, broadcasts `score_update`) |
| `GET` | `/matches/:id/commentary?limit=100` | Fetch match commentary feed (404 if match not found) |
| `POST` | `/matches/:id/commentary` | Add commentary item (validates match existence, broadcasts to subscribers) |

### WebSocket Server (`/ws`)

The WebSocket server runs on the same HTTP server at path `/ws` (e.g. `ws://localhost:8000/ws`).

- **Subscribe to Match**:
  ```json
  { "type": "subscribe", "matchId": 1 }
  ```
  *Response:* `{ "type": "subscribed", "matchId": 1 }`
- **Unsubscribe from Match**:
  ```json
  { "type": "unsubscribe", "matchId": 1 }
  ```
  *Response:* `{ "type": "unsubscribed", "matchId": 1 }`
- **Real-Time Commentary Event**:
  ```json
  { "type": "commentary", "data": { "id": 10, "matchId": 1, "minute": 42, "message": "Goal!", ... } }
  ```
- **Real-Time Score Update Event**:
  ```json
  { "type": "score_update", "matchId": 1, "data": { "id": 1, "homeScore": 2, "awayScore": 1, ... } }
  ```
