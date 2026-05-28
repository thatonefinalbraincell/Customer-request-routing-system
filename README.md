# Cognifyr Workspace

<p align="center">
  <strong>High-throughput, event-driven customer operations platform</strong><br/>
  Built for async workloads, AI pipelines, and real-time observability
</p>

<p align="center">
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/language-TypeScript-blue.svg" />
  </a>
  <a href="https://supabase.com/">
    <img src="https://img.shields.io/badge/database-Supabase%20%2F%20PostgreSQL-emerald.svg" />
  </a>
  <a href="https://bullmq.io/">
    <img src="https://img.shields.io/badge/queue-BullMQ%20%2F%20Redis-red.svg" />
  </a>
  <a href="https://ai.google.dev/">
    <img src="https://img.shields.io/badge/AI-Gemini%202.5%20Flash-indigo.svg" />
  </a>
</p>

## System Architecture

The workflow leverages a decoupled background worker architecture to handle bursts of customer data seamlessly without degrading the user experience.

```text
[ Inbound Request ] ──> [ Express API Server (Zod Validation) ]
                               │
                               ▼
                    [ BullMQ Message Queue ]
                               │
                       (Redis State Layer)
                               │
                               ▼
                  [ Background Worker Loop ]
                               │
             ┌─────────────────┴─────────────────┐
             ▼                                   ▼
 [ Live Gemini 2.5 Flash ]          [ Supabase PostgreSQL DB ]
 (Intent & Urgency Parsing)         (Persistent Asset Storage)
             │                                   │
             └─────────────────┬─────────────────┘
                               ▼
                   [ WebSocket Broadcaster ]
                               │
                               ▼
                 [ Pitch-Black Client Interface ]

```

1. **Ingestion:** The Express server acts as a low-latency gateway, writing requests straight into the Redis database via `BullMQ`.
2. **Asynchronous Execution:** Independent processing threads pick up queued tickets, relieving the main application server from computational blocking.
3. **AI Inference:** The worker queries Google's live **Gemini 2.5 Flash** model using a custom JSON schema constraint to guarantee structural telemetry outputs.
4. **State Synchronicity:** Updates commit to the Supabase database instance while a WebSocket event triggers real-time visual reactivity on the administrative ledger.

---

## Core Technical Stack

* **Runtime Environment:** Node.js (v18.x or higher)
* **Language Layer:** TypeScript (Strict Mode)
* **Framework Core:** Express.js with async routing boundaries
* **Data Modeling:** Prisma ORM communicating with Supabase PostgreSQL
* **Concurrency Brokers:** BullMQ running over an isolated Redis cluster
* **AI Core Integration:** Official Google Gen AI SDK (`@google/genai`)
* **Real-Time Layer:** Native WebSocket abstraction (`ws`)
* **Visual Engine:** Monochromatic Tailwind CSS presentation engine

---

## Directory Schema Map

```text
cognifyr-ops/
├── prisma/                 # Relational schema engines and migration logs
│   └── schema.prisma       # Database design parameters
├── src/                    # TypeSafe Source Directory
│   ├── config/             # Connection configurations (Redis, Database, Client wrappers)
│   ├── controllers/        # Incoming request boundary endpoints
│   ├── public/             # Static UI layout assets (High-Contrast index.html)
│   ├── services/           # Decoupled business logic handling (aiService.ts)
│   ├── worker.ts           # Asynchronous background job queue execution loop
│   └── index.ts            # Core application bootstrap entry point
├── .env.example            # Version-controlled blank environment variable blueprint
├── .gitignore              # Dependency and security credential protection rules
├── package.json            # Manifest file for scripts and runtime dependencies
└── tsconfig.json           # Transpilation parameters for the TypeScript compiler

```

---

## Installation & Configuration Manual

### 1. Clustered Prerequisites

Ensure the target workstation contains active runtime engines for:

* **Node.js** (LTS version >= 18.16.0)
* **Redis Server** (Default local port `6379`)

### 2. Configure Environmental Variables (`.env`)

Duplicate the environment template file:

```bash
cp .env.example .env

```

Open the freshly generated `.env` file and input your secure credentials:

```text
PORT=3000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
GEMINI_API_KEY="AIzaSyYourLiveGoogleGeminiCredentialKeyHere"
JWT_SECRET="YourCustomCryptographicallySecureSigningKeyString"

```

### 3. Install Package Manifests

Download and lock exact package-tree dependencies:

```bash
npm install

```

---

## Runtime Operations Execution

### Production Compilation and Deployment Lifecycle

To clean, build, compile, and execute the production targets securely, run the following command matrix:

```bash
# Compile TypeScript files into JavaScript build targets
npx tsc

# Generate deep-typed database client mappings via Prisma
npx prisma generate

# Initialize the continuous server runtime environment
node dist/index.js

```

### Direct Database Ledger Inspection

To review, debug, or wipe records directly from your local browser without configuring REST routing paths, utilize the integrated UI data manager:

```bash
npx prisma studio

```

*Prisma Studio initializes automatically at `http://localhost:5555`.*

---

## Production Core API Directory

### Authentication Endpoints

* **`POST /auth/login`** - Authenticates administration agents and returns a stateful JWT Bearer Token.

### Request Pipelines

* **`POST /requests`** - Ingests customer support inquiries into the processing flow. *(Public validation pathway).*
* **`GET /requests`** - Returns an array list of all current tracking records. *(Requires valid Authorization Header).*
* **`GET /requests/:id`** - Resolves complete metadata arrays for a designated ticket ID.

### Workflow Management (Protected Actions)

* **`PATCH /requests/:id/status`** - Mutates a ticket state (`QUEUED`, `CLASSIFIED`, `IN_PROGRESS`, `RESOLVED`, `FAILED`).
* **`POST /requests/:id/notes`** - Appends operational internal diary logs to the history database tracker.
* **`POST /requests/:id/retry-classification`** - Re-injects an existing record back into the Redis queue broker to trigger a live reassessment cycle via Gemini.

---

## Administrative Dashboard Operations

Once the system boots completely, open your web browser and navigate to:

```text
http://localhost:3000

```

### Functional Design Specifications

* **Left Panel:** Emulates user-facing forms, letting you mock and push customer problems directly into the backend queues.
* **Center Panel:** A live ledger streaming connected data states via background WebSocket triggers. Status tags utilize dedicated color frames:
* `QUEUED`: High-contrast Amber notification.
* `CLASSIFIED`: High-contrast Emerald notification.
* `FAILED`: High-contrast Red notification.


* **Right Panel:** The analytical inspection workspace displaying deep insight logs parsed by the Gemini integration model, timeline trackers, and execution tools.

```

```
