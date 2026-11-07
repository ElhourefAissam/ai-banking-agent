# PROORGA — AI-Powered Banking Workflow Platform
### Temporary Transfer Limit Increase Engine with Multi-Tier Approvals & Controlled Agent Tools

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![NestJS](https://img.shields.io/badge/Backend-NestJS%2010-ea2849.svg)
![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015%20App%20Router-black.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748.svg)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-336791.svg)
![i18n](https://img.shields.io/badge/i18n-FR%20%7C%20EN%20%7C%20AR%20RTL-success.svg)
![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)

---

## 1. Project Overview

The **PROORGA Banking Workflow Platform** is an enterprise-grade banking application designed to handle customer requests for a **temporary transfer limit increase** (*augmentation temporaire de plafond de virement*).

The system models a retail banking workflow featuring:
1. **Three strictly isolated roles:** Customer (*Client*), Banking Advisor (*Conseiller*), and Risk Supervisor (*Superviseur*).
2. **Deterministic Banking Business Rules & Governance:** Approval thresholds (≤ 30,000 DH for advisors, > 30,000 DH escalated to supervisor), mandatory supporting documents (> 50,000 DH), customer file completeness checks, single-active-request invariants, and cryptographic separation of duties.
3. **Simulated Banking Core with Idempotent Recovery:** Complete separation of approval and activation, deterministic failure injection modes (`NETWORK_TIMEOUT`, `LOST_ACK`, `BANK_500`), and automatic limit expiration with baseline restoration (10,000 DH).
4. **Controlled AI Banking Assistant:** An AI agent capable of inspecting permitted banking data and preparing drafts via server-side tools, requiring **explicit confirmation** before submission, with zero direct approval or bypass authority.
5. **Full Internationalization (i18n) & Arabic RTL:** French by default, English, and complete Right-to-Left Arabic layout, typography, and localized currency formatting (`DH` / `MAD` / `د.م.`).

---

## 2. Architecture & Design Principles

The application is structured as a **Modular Monolith** in a strongly-typed TypeScript monorepo using `pnpm workspaces`:

```mermaid
graph TD
    subgraph Presentation ["Client Presentation Layer (apps/web)"]
        NextApp["Next.js 15 App Router & React 19"]
        I18nEngine["i18n Engine (FR default, EN, AR RTL)"]
        TailwindCSS["Restrained Banking Design System"]
        NextApp --> I18nEngine
        NextApp --> TailwindCSS
    end

    subgraph ApiGateway ["API Gateway & Security Core (apps/api)"]
        NestApp["NestJS REST API (/api/v1)"]
        AuthModule["JWT & Session Auth Guard"]
        RbacAbac["RBAC / ABAC Ownership Policies"]
        RateLimit["Throttler / Rate Limiter"]
        NestApp --> RateLimit
        RateLimit --> AuthModule
        AuthModule --> RbacAbac
    end

    subgraph DomainCore ["Domain & Application Layer"]
        WorkflowService["Workflow Engine (Finite State Machine)"]
        RulesValidator["Domain Invariant Engine"]
        AuditService["Immutable Audit Trail"]
        BankingSimulator["Banking Simulator Engine"]
        AiOrchestrator["AI Tool Calling Orchestrator"]
        
        RbacAbac --> WorkflowService
        RbacAbac --> AiOrchestrator
        WorkflowService --> RulesValidator
        WorkflowService --> BankingSimulator
        WorkflowService --> AuditService
    end

    subgraph Persistence ["Persistence & External Engine"]
        Postgres[("PostgreSQL 16 (Port 5434)")]
        RedisQueue[("Redis 7 (Port 6380)")]
        LlmProvider["LLM Provider (Built-in Mock / OpenAI / Gemini)"]
        
        DomainCore --> Postgres
        DomainCore --> RedisQueue
        AiOrchestrator --> LlmProvider
    end

    NextApp -->|Bearer Auth / Cookies| NestApp
```

### Monorepo Structure

```text
proorga-ai-banking-agent/
├── apps/
│   ├── web/                    # Next.js 15 App Router frontend application
│   │   ├── src/
│   │   │   ├── app/            # Root layout, globals.css, localized shell
│   │   │   ├── components/     # UI primitives (Card, Button, Modal, StatusBadge)
│   │   │   ├── features/       # Role workspaces: client, advisor, supervisor, ai-chat
│   │   │   ├── i18n/           # Translation dictionaries (fr.json, en.json, ar.json)
│   │   │   └── lib/            # Typed API client
│   │   └── Dockerfile
│   │
│   └── api/                    # NestJS modular backend API
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/              # JWT issuance, strategies, password hashing
│       │   │   ├── accounts/          # Accounts, balances, transfer limits
│       │   │   ├── customers/         # Customer profiles & KYC file completeness
│       │   │   ├── requests/          # Request management & queues
│       │   │   ├── workflow/          # Finite State Machine & decisions
│       │   │   ├── banking-simulator/ # Core activation, idempotency, failure modes
│       │   │   ├── documents/         # Uploads, MIME checks, SHA-256 storage
│       │   │   ├── ai/                # LLM provider adapter, controlled tools
│       │   │   ├── audit/             # Structured audit logging
│       │   │   └── health/            # Readiness & health endpoints
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma   # PostgreSQL models with Decimal(12,2)
│       │   └── seed.ts         # Realistic multi-role demo seed dataset
│       └── Dockerfile
│
├── packages/
│   ├── shared-types/           # TypeScript enums, models, and API interfaces
│   └── shared-validation/      # Shared Zod schemas (limits, durations, credentials)
│
├── docs/                       # Formal design documentation
│   ├── REQUIREMENTS.md         # Full traceability matrix from technical assignment PDF
│   ├── ARCHITECTURE.md         # Modular monolith, security, and AI architecture
│   ├── DATABASE.md             # Relational schema specification & ER diagram
│   ├── WORKFLOW.md             # Complete Finite State Machine transition matrix
│   └── IMPLEMENTATION_PLAN.md  # Sequenced phased implementation roadmap
│
├── TASKS.md                    # Detailed progress tracking checklist
├── docker-compose.yml          # Containerized deployment (Postgres, Redis, API, Web)
├── .env.example                # Documented configuration template
└── README.md
```

---

## 3. Strict Banking Workflow & Finite State Machine

The limit increase request lifecycle is governed by an explicit Finite State Machine with optimistic concurrency locking:

```mermaid
stateDiagram-v2
    [*] --> DRAFT : createDraft()
    
    DRAFT --> SUBMITTED : submitRequest()\n[File COMPLETE, 10k < amt <= 100k, Doc if > 50k]
    DRAFT --> CANCELLED : cancelRequest()
    
    SUBMITTED --> UNDER_REVIEW : assignAdvisor()
    SUBMITTED --> CANCELLED : cancelRequest()
    
    UNDER_REVIEW --> COMPLEMENT_REQUESTED : requestComplement()\n[Advisor + Motive]
    UNDER_REVIEW --> APPROVED_PENDING_ACTIVATION : approveRequest()\n[Advisor + amt <= 30k + Motive]
    UNDER_REVIEW --> PENDING_SUPERVISOR : recommendApproval()\n[Advisor + amt > 30k + Motive]
    UNDER_REVIEW --> REJECTED : rejectRequest()\n[Advisor + Motive]
    UNDER_REVIEW --> CANCELLED : cancelRequest()
    
    COMPLEMENT_REQUESTED --> SUBMITTED : resubmitRequest()\n[Client updates info/doc]
    COMPLEMENT_REQUESTED --> CANCELLED : cancelRequest()
    
    PENDING_SUPERVISOR --> APPROVED_PENDING_ACTIVATION : approveRequest()\n[Supervisor + separation of duties + Motive]
    PENDING_SUPERVISOR --> REJECTED : rejectRequest()\n[Supervisor + Motive]
    
    APPROVED_PENDING_ACTIVATION --> ACTIVE : activateLimitSuccess()\n[Host Core ACK]
    APPROVED_PENDING_ACTIVATION --> ACTIVATION_FAILED : activateLimitFailure()\n[Simulator failure / timeout]
    
    ACTIVATION_FAILED --> ACTIVE : retryActivation()\n[Idempotent retry succeeds]
    
    ACTIVE --> EXPIRED : restoreLimit()\n[Duration elapsed, 10k DH restored]
    
    REJECTED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

---

## 4. Demo Accounts & Credentials

The platform includes a realistic, pre-seeded dataset. All passwords are set to `Password123!` (or click directly in the UI via the **Quick Demo Switcher** dropdown in the top navigation header):

| Role | Name | Email | Password | Specific Features / Test Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **CLIENT** | Karim Alami | `client1@proorga.bank` | `Password123!` | Complete file, 75,450 DH balance, standard 10,000 DH limit. Ideal for standard tests. |
| **CLIENT** | Leila Benjelloun | `client2@proorga.bank` | `Password123!` | Complete file, 142,800 DH balance, pre-existing 65,000 DH request escalated to supervisor. |
| **CLIENT** | Youssef Tazi | `client3@proorga.bank` | `Password123!` | **Incomplete Customer File** (KYC missing). Demonstrates blocked submission rule. |
| **CONSEILLER** | Mehdi Chraibi | `conseiller1@proorga.bank` | `Password123!` | Advisor (Casablanca Portfolio). Delegation authority up to 30,000 DH. |
| **CONSEILLER** | Fatima-Zahra Idrissi | `conseiller2@proorga.bank` | `Password123!` | Advisor (Rabat Portfolio). |
| **SUPERVISEUR** | Omar Berrada | `superviseur1@proorga.bank` | `Password123!` | Risk Supervisor. Validates requests > 30,000 DH. Recommended request S2. |
| **SUPERVISEUR** | Nadia Mansouri | `superviseur2@proorga.bank` | `Password123!` | Risk Supervisor. Enforces **Separation of Duties** test scenarios. |
| **ADMIN** | Tariq Amrani | `admin@proorga.bank` | `Password123!` | System Administrator with omni-access for testing. |

---

## 5. Quick Start & Docker Deployment

### Prerequisites
- **For Docker Deployment (Recommended):** [Docker Desktop](https://www.docker.com/) or Docker Engine with Docker Compose v2+ installed.
- **For Local Development:** Node.js >= 20 (Node 22 LTS recommended) and `pnpm` >= 9.

---

### Option A: Complete Docker Compose Stack (Recommended for Evaluation & Production)

This option launches the complete application stack (**PostgreSQL 16**, **Redis 7**, **NestJS API**, and **Next.js Web Frontend**) in isolated, production-grade Docker containers. It requires **zero host dependencies** (no local Node.js or PostgreSQL required).

#### 1. Clone & Configure Environment
```bash
git clone git@github.com:ElhourefAissam/ai-banking-agent.git
cd ai-banking-agent

# Create environment file from template
cp .env.example .env
```

#### 2. Start All Services with Docker Compose
```bash
docker compose up -d --build
# Or using pnpm shortcut:
pnpm docker:build
```

#### What Happens Automatically on Startup:
1. **PostgreSQL 16** starts on host port `5434` with an active healthcheck (`pg_isready`).
2. **Redis 7** starts on host port `6380` with an active healthcheck (`redis-cli ping`).
3. **NestJS API** waits for database and redis readiness, then executes the built-in entrypoint:
   - **Prisma Migrations:** Automatically runs `prisma migrate deploy` to ensure the schema is current.
   - **Auto-Seed Detection:** Automatically inspects the database; if clean/empty, it populates all 8 demo accounts, portfolio assignments, seed requests, and notifications.
   - Starts the HTTP service on port `4001`.
4. **Next.js Web UI** starts on port `3002`, routing client requests through an internal network proxy to the API container.

#### 3. Access the Platform
Once the containers are healthy (typically 10-15 seconds):

| Service | Host URL | Description |
| :--- | :--- | :--- |
| **Banking Web UI** | [http://localhost:3002](http://localhost:3002) | Customer, Advisor & Supervisor portals (with Quick Role Switcher) |
| **Swagger OpenAPI Docs** | [http://localhost:4001/api/docs](http://localhost:4001/api/docs) | Interactive Swagger UI for all REST endpoints |
| **API Healthcheck** | [http://localhost:4001/api/v1/health](http://localhost:4001/api/v1/health) | System health, database connection, and uptime status |
| **PostgreSQL Database** | `localhost:5434` | DB: `proorga_banking`, User: `proorga`, Password: `proorga_secret` |
| **Redis Cache** | `localhost:6380` | Redis 7 key-value store |

> [!TIP]
> You can log in using any of the pre-seeded credentials listed in [Section 4](#4-demo-accounts--credentials), or simply use the **Quick Demo Switcher** dropdown located in the header of the web application.

---

### Docker Management Commands Cheat Sheet

| Action | Native Docker Command | Convenience pnpm Shortcut |
| :--- | :--- | :--- |
| **Build & Start all containers** | `docker compose up -d --build` | `pnpm docker:build` |
| **Start existing containers** | `docker compose up -d` | `pnpm docker:up` |
| **Stop all containers** | `docker compose down` | `pnpm docker:down` |
| **View real-time combined logs** | `docker compose logs -f` | `pnpm docker:logs` |
| **View specific service logs** | `docker compose logs -f api` *(or `web`, `postgres`)* | — |
| **Check service status** | `docker compose ps` | — |
| **Reseed demo dataset** | `docker compose exec -w /app/apps/api api ./node_modules/.bin/ts-node prisma/seed.ts` | `pnpm docker:seed` |
| **Deploy migrations manually** | `docker compose exec -w /app/apps/api api ./node_modules/.bin/prisma migrate deploy` | `pnpm docker:migrate` |
| **Run E2E scenarios against Docker** | `pnpm demo:scenarios` *(from host)* | `pnpm demo:scenarios` |
| **Complete reset (wipe DB & volumes)** | `docker compose down -v` | `pnpm docker:clean` |

---

### Option B: Local Hybrid Development Setup (Hot-Reloading)

For active feature development where you want instantaneous hot module reloading (HMR) for both backend and frontend:

1. **Clone & install monorepo dependencies:**
   ```bash
   pnpm install
   ```

2. **Start PostgreSQL & Redis background containers only:**
   *(Host ports configured: Postgres on 5434, Redis on 6380 to avoid standard 5432/6379 local port conflicts)*
   ```bash
   docker compose up -d postgres redis
   ```

3. **Initialize database schema & run seed script:**
   ```bash
   cp .env.example .env
   cp .env.example apps/api/.env
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Start the Backend API with watch mode (Port 4001):**
   ```bash
   pnpm dev:api
   # Swagger docs available at: http://localhost:4001/api/docs
   ```

5. **Start the Frontend Web Application with Fast Refresh (Port 3002):**
   ```bash
   pnpm dev:web
   # Access application at: http://localhost:3002
   ```

---

### Docker Architecture & Configuration Details

#### Persistent Volumes
Docker volumes preserve state across container restarts and rebuilds:
- `proorga_postgres_data`: Persistent storage for PostgreSQL database schemas, users, and audit logs.
- `proorga_redis_data`: Persistent cache and session storage.
- `proorga_uploads_data`: Persistent storage for uploaded supporting documents (PDFs, invoices, identity documents).

#### AI Assistant Configuration in Docker
The platform runs **100% offline out of the box** using a deterministic mock provider. You can switch to external LLM providers at any time by editing `.env`:
```env
# Built-in Mock (Default - zero external API keys needed)
AI_PROVIDER=mock

# Or switch to OpenAI:
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-proj-...
# AI_MODEL=gpt-4o-mini

# Or switch to Google Gemini:
# AI_PROVIDER=gemini
# GEMINI_API_KEY=AIzaSy...
```
Restart the API container to apply changes:
```bash
docker compose up -d api
```

#### Troubleshooting Docker Issues

- **Port Conflict (`bind: address already in use`):**
  If port `3002`, `4001`, `5434`, or `6380` is already in use by another application on your system, adjust the exposed ports in your `.env` file:
  ```env
  WEB_PORT=3005
  API_PORT=4005
  POSTGRES_PORT=5435
  REDIS_PORT=6385
  ```
  Then restart with `docker compose up -d`.

- **Resetting to a Pristine Demo State:**
  To completely clear the database and reseed from scratch:
  ```bash
  docker compose down -v
  docker compose up -d --build
  ```

- **Rebuilding after code changes:**
  ```bash
  docker compose up -d --build
  ```

---

## 6. Verification & Automated Acceptance Tests

The test suite validates the business logic and executes all **7 Official Acceptance Scenarios** defined in `CDC-FULL STACK.pdf` (Page 6).

### Run All Unit & Integration Tests:
```bash
# Run banking rules unit tests
pnpm test

# Run the 7 official technical assignment acceptance scenarios (E2E)
pnpm test:e2e
```

### Official Acceptance Scenarios Tested:

| Scenario | Objective | Tested Outcome |
| :---: | :--- | :--- |
| **S1** | **Standard Advisor Flow (25 000 DH / 3 days)** | Client drafts, confirms parameters, submits. Advisor directly approves (≤ 30,000 DH). Limit activates to 25,000 DH. Expiration restores 10,000 DH. |
| **S2** | **Escalated Flow with Complements (60 000 DH)** | Submission without document is blocked. Document uploaded. Advisor issues motivated complement request. Client responds. Advisor recommends. Supervisor approves. Limit activated. |
| **S3** | **Access Control & IDOR Prevention** | Client 1 accessing Client 2 request -> `403 Forbidden`. Advisor attempting to approve > 30,000 DH directly -> `403 Forbidden`. Incomplete file submission -> `400 Bad Request`. |
| **S4** | **Concurrency Protection** | Duplicate concurrent submissions on the same account -> rejected with `409 Conflict`. Concurrent decisions on stale version -> rejected with `409 Version Conflict`. |
| **S5** | **Failure Recovery & Idempotent Retry** | Simulator activation network failure records `ACTIVATION_FAILED`. Subsequent retry using the same idempotency key activates cleanly with zero duplicate operations. |
| **S6** | **Cancellation Before Decision** | Client cancels submitted request before advisor decision. Subsequent review attempt by advisor on stale screen is rejected with `409 / 400`. |
| **S7** | **AI Safety & Graceful Fallback** | Prompt injection attempting to bypass rules or force approval is neutralized. Disconnecting AI leaves manual forms 100% operational. |

---

## 7. AI Assistant & Controlled Tool Calling

The AI Assistant follows a **Controlled Server-Side Tool Calling Architecture**:

```mermaid
sequenceDiagram
    actor Client as Customer
    participant ChatUI as Web Chat Drawer
    participant AiService as Backend AI Orchestration
    participant LLM as LLM Provider Adapter
    participant ToolEngine as Controlled Tool Registry
    participant CoreDB as PostgreSQL

    Client->>ChatUI: "Je veux augmenter mon plafond à 25 000 DH pendant 3 jours"
    ChatUI->>AiService: POST /api/v1/ai/chat
    AiService->>LLM: Send message history + Authorized client tools
    LLM-->>AiService: Tool Call: create_limit_request_draft(25000, 3, "Voyage")
    AiService->>ToolEngine: Execute create_limit_request_draft()
    ToolEngine->>CoreDB: INSERT draft into LimitRequest
    CoreDB-->>ToolEngine: Draft created (version 1)
    ToolEngine-->>AiService: Return draft summary + Confirmation Token
    AiService->>LLM: Pass tool result
    LLM-->>AiService: "J'ai préparé votre brouillon. Veuillez vérifier et confirmer..."
    AiService-->>ChatUI: Assistant reply + Explicit Confirmation Card
    Note over Client,ChatUI: Client inspects exact values and clicks [Valider et soumettre définitivement]
    Client->>ChatUI: Click [Valider et soumettre]
    ChatUI->>AiService: POST /api/v1/requests/:id/submit
    AiService->>CoreDB: Transition to SUBMITTED
```

### Safety Features:
- **Zero Approval Authority:** The AI agent cannot approve requests or activate limits.
- **Server-Derived Identity:** Identity is extracted strictly from the authenticated JWT session, never from model arguments.
- **Explicit Confirmation Card:** A conversation alone does not constitute a submission. An unmissable Confirmation Card with cryptographic hash of parameters is rendered for explicit customer confirmation.
- **Offline Mock Provider:** Built-in deterministic mock provider allows running the application and all tests offline with zero API keys required. External OpenAI/Anthropic/Gemini keys can be configured via `.env`.

---

## 8. Internationalization (i18n) & Arabic RTL Support

The application delivers a localized financial SaaS experience:

- **Default Language:** French (`fr`) is the primary default across the platform.
- **English (`en`)** and **Arabic (`ar`)** are supported with dynamic switching from the top header.
- **Full Arabic RTL:**
  - Automatic `dir="rtl"` applied to document root.
  - Logical CSS properties throughout layout (`ms-*`, `me-*`, `start-*`, `end-*`, `text-start`).
  - Arabic typography via Cairo / IBM Plex Sans Arabic.
  - Locale-aware currency formatting (`DH`, `MAD`, `د.م.`) and dates via `Intl`.

---

## 9. Banking Simulator & Failure Injection

The simulator models core banking communication and deterministic failure recovery:

- **Idempotency Key Protocol:** `sha256(requestId + ":" + version + ":ACTIVATION")`.
- **Live Simulator Control Panel:** Click the **Simulateur** button in the application header to inject failure modes:
  - `NONE`: Nominal successful activation.
  - `NETWORK_TIMEOUT`: Simulates socket timeout (sets status to `ACTIVATION_FAILED`).
  - `LOST_ACK`: Core applies limit internally, but socket closes before response delivery. Relance idempotente recovers the outcome without double application.
- **Check Expirations Trigger:** Button in simulator modal scans active limits and restores the baseline 10,000 DH for overdue requests.

---

## 10. Traceability & Compliance Deliverables

All required technical documents have been baselined in the `docs/` folder:
- [Requirements & Traceability Matrix (`docs/REQUIREMENTS.md`)](docs/REQUIREMENTS.md)
- [Architecture & Security Blueprint (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
- [Database Schema & ERD (`docs/DATABASE.md`)](docs/DATABASE.md)
- [State Machine & Finite State Workflow (`docs/WORKFLOW.md`)](docs/WORKFLOW.md)
- [Phased Implementation Roadmap (`docs/IMPLEMENTATION_PLAN.md`)](docs/IMPLEMENTATION_PLAN.md)
- [Interactive Progress Tracking Checklist (`TASKS.md`)](TASKS.md)

---

## 11. Known Assumptions & Engineering Trade-Offs

1. **Monorepo Structure:** We chose a clean modular monolith over microservices. For a banking workflow of this scope, a modular monolith guarantees ACID transactional consistency, simplifies optimistic concurrency locking, and avoids distributed saga complexity.
2. **Monetary Precision:** Handled exclusively via `Decimal(12, 2)` / `NUMERIC` types, preventing floating-point rounding errors.
3. **Fictional Documents:** Files are stored in `./uploads/` with SHA-256 checksums and MIME validation (PDF, PNG, JPG). Advanced OCR was intentionally omitted as indicated in the assignment.
4. **Deterministic Mock Mode:** The built-in mock LLM provider ensures that evaluators can run the entire platform, tests, and demo without needing external OpenAI or Gemini API keys.
