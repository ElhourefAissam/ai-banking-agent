# PROORGA Implementation Progress Checklist (TASKS.md)

> This document tracks the implementation progress of the PROORGA AI-Powered Banking Workflow Platform.
> It is updated as features and components are completed and verified.

---

## Phase 1: Planning, Invariants & Architecture Baseline
- [x] Inspect project workspace and read the technical assignment PDF (`CDC-FULL STACK.pdf`).
- [x] Extract all business rules, thresholds, constraints, roles, and acceptance scenarios.
- [x] Create `docs/REQUIREMENTS.md` with complete traceability matrix.
- [x] Create `docs/ARCHITECTURE.md` with modular monolith design and security layers.
- [x] Create `docs/DATABASE.md` with relational schema, Decimal types, and ER diagram.
- [x] Create `docs/WORKFLOW.md` with state machine, guard conditions, and transition matrix.
- [x] Create `docs/IMPLEMENTATION_PLAN.md` with phased delivery roadmap.
- [x] Initialize `TASKS.md` checklist.

---

## Phase 2: Monorepo & Tooling Setup
- [x] Initialize pnpm workspace (`pnpm-workspace.yaml`, root `package.json`).
- [x] Create `packages/shared-types` with TypeScript enums, models, and API interfaces.
- [x] Create `packages/shared-validation` with shared Zod schemas (limits, durations, credentials).
- [x] Create `.env.example` with documented environment variables.
- [x] Create `docker-compose.yml` for PostgreSQL, Redis, API, and Web with non-conflicting host ports.

---

## Phase 3: Backend Foundation & Data Persistence
- [x] Scaffold NestJS backend in `apps/api`.
- [x] Configure Prisma ORM with PostgreSQL models in `prisma/schema.prisma`.
- [x] Execute initial database migration.
- [x] Implement Authentication Module (JWT, Passport, bcrypt, cookie & header extraction).
- [x] Implement Users & Accounts Module (Accounts, CustomerProfiles, portfolios, teams).
- [x] Implement RBAC and ABAC authorization guards (`@Roles`, ownership checks).
- [x] Create realistic database seed script (`prisma/seed.ts`) with demo users for all 3 roles.

---

## Phase 4: Business Workflow Engine & Domain Invariants
- [x] Implement `RequestsModule` with DTOs and database operations.
- [x] Implement `WorkflowService` finite state machine:
  - [x] `createDraft()`
  - [x] `submitRequest()` (validates file completeness, amount bounds, duration, document)
  - [x] `requestComplement()` (requires advisor motive)
  - [x] `resubmitRequest()` (increments version, snapshots history)
  - [x] `approveRequest()` (checks threshold ≤ 30k for advisor, enforces supervisor role > 30k)
  - [x] `recommendApproval()` (for advisor when amount > 30k)
  - [x] `rejectRequest()` (requires mandatory motive)
  - [x] `cancelRequest()` (allowed only before first decision)
- [x] Enforce Separation of Duties: Advisor who recommended cannot supervise.
- [x] Enforce Optimistic Locking on all transitions with request `version`.
- [x] Enforce Single Active Request per account constraint at DB and service levels.
- [x] Implement Document Upload with MIME validation (PDF, PNG, JPG) and storage.
- [x] Implement Audit Trail recording for all state transitions and human decisions.

---

## Phase 5: Banking Simulator & Background Processing
- [x] Implement `BankingSimulatorService` simulating core banking limits:
  - [x] Activation protocol with idempotency keys.
  - [x] Deterministic failure simulation (`NETWORK_TIMEOUT`, `LOST_ACK`, `SUCCESS`).
  - [x] Idempotent retry without duplicate activation.
  - [x] Limit restoration to 10,000 DH upon expiration.
- [x] Implement background worker or scheduled tasks for limit expiration and retry handling.
- [x] Expose manual demo trigger endpoint for simulating time-travel expiration.

---

## Phase 6: Frontend & Banking SaaS Design System
- [x] Scaffold Next.js 15 App Router in `apps/web`.
- [x] Configure Tailwind CSS with restrained financial color tokens and accessible styling.
- [x] Build reusable UI primitives (Buttons, Inputs, Modals, Tables, Status Badges, Tabs, Alerts).
- [x] Implement Authentication provider, session management, and Quick Role Switcher for demos.
- [x] Implement **Client Workspace**:
  - [x] Dashboard: Account summary, current 10,000 DH limit, active request status banner.
  - [x] New Limit Request form with reactive validation and document upload (> 50,000 DH).
  - [x] Request Details page with visual timeline, version history, and complement response modal.
  - [x] Request cancellation action before decision.
- [x] Implement **Advisor Workspace**:
  - [x] Portfolio dashboard and request queue.
  - [x] Review panel with customer profile, file completeness status, and attached documents.
  - [x] Decision modal: Direct Approval (≤ 30k), Recommendation (> 30k), Complement, Rejection.
- [x] Implement **Supervisor Workspace**:
  - [x] Escalated requests queue (> 30k).
  - [x] Review of advisor recommendation, customer profile, and audit trail.
  - [x] Supervisor Approval and Rejection actions with mandatory motive.

---

## Phase 7: Internationalization (i18n) & Full Arabic RTL
- [x] Implement i18n dictionary system with French (`fr`) as the primary default.
- [x] Create translation dictionaries (`fr.json`, `en.json`, `ar.json`).
- [x] Implement Language Switcher in the top navigation bar with persistent preference.
- [x] Implement complete Arabic RTL support:
  - [x] Dynamic `dir="rtl"` and `lang="ar"`.
  - [x] Logical Tailwind layout properties throughout components.
  - [x] Proper visual alignment of tables, sidebars, cards, and modals in RTL.
  - [x] Localized number and MAD currency formatting.

---

## Phase 8: AI Assistant with Controlled Tools & Safety
- [x] Implement `AiModule` with provider abstraction interface (`LlmProvider`).
- [x] Implement deterministic `MockLlmAdapter` for zero-credential offline demo and testing.
- [x] Implement external provider adapter (OpenAI / Anthropic / Gemini compatible).
- [x] Implement Controlled Tool Calling registry:
  - [x] `get_account_limit`
  - [x] `get_customer_file_status`
  - [x] `get_request_details`
  - [x] `create_limit_request_draft`
  - [x] `submit_limit_request`
- [x] Enforce server-side role filtering so clients never receive advisor/supervisor tools.
- [x] Implement explicit Confirmation Card UI in chat: AI prepares draft, user explicitly confirms before submission.
- [x] Implement anti-prompt-injection system prompt and backend validation barriers.
- [x] Implement conversation persistence (`AIConversation`, `AIMessage`).

---

## Phase 9: Automated Testing Suite
- [x] Write Unit Tests for domain rules (limits, duration, completeness, thresholds).
- [x] Write Integration Tests for complete state machine transitions and audit events.
- [x] Write Concurrency Tests (simultaneous account submissions, concurrent decisions with optimistic lock).
- [x] Write AI Module Tests (tool execution, prompt injection defense, mock fallback).
- [x] Implement automated test runner for the 7 PDF Acceptance Scenarios (S1 through S7).

---

## Phase 10: Verification, Documentation & Production Readiness
- [x] Validate Docker Compose startup (`docker-compose up`).
- [x] Validate database migration and seed data execution.
- [x] Execute test suite and verify 100% pass rate.
- [x] Create comprehensive `README.md` with:
  - [x] Architecture, workflow, and ER diagrams.
  - [x] Step-by-step launch commands.
  - [x] Demo credentials table for all roles.
  - [x] Acceptance scenarios playback instructions.
  - [x] Documented assumptions and architectural trade-offs.

---

## Phase 11: Frontend UI/UX Refinement & Responsive Mobile Design
- [x] **Tactile Button System**: Upgraded `Button` primitive with micro-interactions (`active:scale-[0.98]`), calibrated padding scale (`xs`, `sm`, `md`, `lg`, `icon`), focus rings, and flex gaps.
- [x] **Responsive Mobile Navigation**:
  - [x] Mobile slide-out drawer in `Sidebar` with backdrop blur overlay, auto-close on item selection, and RTL logical positioning (`start-0`).
  - [x] Hamburger toggle button in `Header` visible on `< md` screens.
- [x] **Layout & Button Spacing Fixes**:
  - [x] Replaced legacy `space-x-*` with flexbox `gap-1.5 sm:gap-2` across all table action cells to prevent RTL misalignments.
  - [x] Made modal footers and form action bars wrap cleanly (`flex-col-reverse sm:flex-row`).
  - [x] Responsive modal container with `max-h-[90vh]` and internal scroll area.
- [x] **Quick Action Presets (Mobile & Desktop UX)**:
  - [x] Added quick amount preset chips (15k, 25k, 35k, 60k, 90k DH) in `NewRequestForm`.
  - [x] Added quick duration preset chips (1j, 2j, 3j, 5j, 7j) in `NewRequestForm`.
  - [x] Added horizontal quick prompt suggestion pills in `AiChatDrawer`.
- [x] **Build & Test Verification**:
  - [x] Clean Next.js 15 production build with 0 errors (`pnpm --filter proorga-web build`).
  - [x] 10/10 Banking rule unit tests passing (`pnpm test`).
  - [x] 18/18 E2E acceptance scenario tests passing (`pnpm test:e2e`).
  - [x] Standalone CLI scenario runner verified (`pnpm demo:scenarios`).

---

## Phase 12: Request History & Past Requests Visibility (Advisor & Supervisor)
- [x] **Full Request History & Audit Modal (`RequestDetailsModal`)**:
  - [x] Switchable tabs: "Vue Générale & Justificatifs" vs "Historique & Traçabilité Complète" (with total items counter badge).
  - [x] **Versions History (`RequestVersion`)**: Timeline of all version snapshots (v1, v2, v3...), timestamp, requested limit snapshot, duration, and amendment reason.
  - [x] **Decisions History (`Decision`)**: Chronological audit trail showing actor's full name, role, email, decision type badge, date/time, and mandatory motive.
  - [x] **Switch & Core Activations (`BankingActivation`)**: Displays switch activation status (`SUCCESS` / `FAILED`), idempotency key, activation time, and limit restoration on expiration.
- [x] **Conseiller / Advisor Workspace Past Requests & History**:
  - [x] Backend `getAdvisorQueue` updated to return both pending and past requests (`APPROVED`, `REJECTED`, `EXPIRED`, `CANCELLED`, `ACTIVE`).
  - [x] Quick filter pills: "Tous les dossiers", "À instruire en priorité", "Plafonds actifs", "En attente superviseur", "Historique passé".
  - [x] Dedicated "Détails & Historique" button with `Eye` icon on every table row.
- [x] **Superviseur / Supervisor Workspace Past Requests & History**:
  - [x] Backend `getSupervisorQueue` updated to return escalated queue (`PENDING_SUPERVISOR`) AND historical dossiers (> 30k DH, past supervisor decisions).
  - [x] Dual-tab layout: "Dossiers en attente d'arbitrage" and "Historique des dossiers passés".
  - [x] Dedicated "Détails & Historique" button on every card and historical row.
- [x] **AppShell Wiring**: Connected `onViewRequest={handleOpenRequestDetails}` to both `AdvisorWorkspace` and `SupervisorWorkspace`.

---

## Phase 13: Multi-Page Routing Architecture & Slide-Over Request Drawer
- [x] **Next.js App Router Multi-Page Migration (Not a Single Page App)**:
  - [x] `/dashboard`: Client dashboard (accounts, active requests, balance overview).
  - [x] `/requests`: Client requests history view ("Mes Demandes").
  - [x] `/requests/new`: New limit request form with interactive sliders and preset chips.
  - [x] `/requests/[id]`: Request details drawer view with request ID in the link (shareable & refreshable).
  - [x] `/advisor`: Advisor workspace with portfolio queue, status pills, and search.
  - [x] `/supervisor`: Supervisor workspace with dual tabs (arbitration queue vs past history).
  - [x] `/ai`: AI assistant dedicated workspace with controlled banking tools.
  - [x] `/scenarios`: Scenarios runner test bench for the 7 official PDF scenarios.
  - [x] `/audit`: Real-time PostgreSQL audit trail explorer.
  - [x] `/`: Root role-based automatic redirection.
- [x] **Enterprise Slide-Over Drawer (`apps/web/src/components/ui/drawer.tsx`)**:
  - [x] Replaced centered modal with slide-over drawer from `end-0` (right in LTR, left in RTL).
  - [x] Backdrop blur overlay, ESC key listener, focus styles, sticky header and sticky footer.
  - [x] Responsive width (`w-screen max-w-2xl lg:max-w-3xl`) and scrollable content area.
- [x] **Shareable & Refreshable Request Links**:
  - [x] Opening any request navigates to `/requests/[id]` with ID in the URL.
  - [x] Refreshing (`F5`) or sharing link reloads the request drawer directly with authorization validation.
  - [x] Added "Partager le lien" copy-to-clipboard action with visual confirmation.
  - [x] Graceful IDOR defense message if user lacks access to the shared request.
