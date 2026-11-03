# PROORGA — Database Schema & Data Model Specification

## 1. Data Model Philosophy

The PROORGA banking data model is designed to satisfy the rigorous audit, compliance, and consistency standards of a regulated financial institution:

1. **Zero Monetary Floating-Point Numbers:** All financial amounts are stored as exact `Decimal(12, 2)` (PostgreSQL `NUMERIC(12, 2)`).
2. **Immutable Audit & Decision History:** Business decisions (`Decision`) and audit events (`AuditEvent`) are append-only.
3. **Explicit Version Snapshots:** Every state transition captures an immutable request snapshot (`RequestVersion`) storing previous values.
4. **Optimistic Locking:** The `LimitRequest` table contains an integer `version` incremented on every state modification to prevent race conditions.
5. **Database-Enforced Uniqueness of Active Requests:** Prevents duplicate concurrent active or pending requests per account.
6. **UTC Timestamps:** All dates and times (`createdAt`, `updatedAt`, `activeFrom`, `activeUntil`) are strictly recorded in UTC.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ CustomerProfile : has
    User ||--o{ Decision : makes
    User ||--o{ AuditEvent : triggers
    User ||--o{ AIConversation : owns

    CustomerProfile ||--o{ Account : owns
    CustomerProfile ||--o{ LimitRequest : requests

    Account ||--o{ LimitRequest : targets
    Account ||--o{ BankingActivation : updates

    LimitRequest ||--o{ RequestVersion : records
    LimitRequest ||--o{ RequestDocument : attaches
    LimitRequest ||--o{ Decision : receives
    LimitRequest ||--o{ BankingActivation : activates

    AIConversation ||--o{ AIMessage : contains

    User {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role "CLIENT | CONSEILLER | SUPERVISEUR | ADMIN"
        string portfolioId "Nullable (advisors)"
        string teamId "Nullable (supervisors)"
        timestamp createdAt
        timestamp updatedAt
    }

    CustomerProfile {
        uuid id PK
        uuid userId FK, UK
        string cin UK "National Identity Card"
        enum fileStatus "COMPLETE | INCOMPLETE"
        string incompleteReason "Nullable"
        string address
        string phone
        timestamp createdAt
        timestamp updatedAt
    }

    Account {
        uuid id PK
        uuid customerProfileId FK
        string accountNumber UK
        string iban UK
        decimal balance "12, 2"
        decimal initialTransferLimit "12, 2" "Default: 10,000 DH"
        decimal currentTransferLimit "12, 2"
        string currency "MAD"
        timestamp activeLimitExpiry "Nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    LimitRequest {
        uuid id PK
        string reference UK "e.g. REQ-2026-0001"
        uuid accountId FK
        uuid customerProfileId FK
        decimal initialLimit "12, 2"
        decimal requestedLimit "12, 2"
        int durationDays "1 to 7"
        text reason
        enum status "DRAFT | SUBMITTED | UNDER_REVIEW | COMPLEMENT_REQUESTED | PENDING_SUPERVISOR | APPROVED_PENDING_ACTIVATION | ACTIVE | ACTIVATION_FAILED | REJECTED | CANCELLED | EXPIRED"
        int version "Default: 1"
        uuid assignedAdvisorId FK "Nullable"
        boolean requiredDocumentsProvided "Default: false"
        timestamp activeFrom "Nullable"
        timestamp activeUntil "Nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    RequestVersion {
        uuid id PK
        uuid requestId FK
        int versionNumber
        jsonb snapshot
        string changeReason
        uuid createdById FK
        timestamp createdAt
    }

    RequestDocument {
        uuid id PK
        uuid requestId FK
        string fileName
        string fileType "MIME: pdf, png, jpg"
        int fileSize "Bytes"
        string storagePath
        string checksum "SHA-256"
        uuid uploadedById FK
        timestamp createdAt
    }

    Decision {
        uuid id PK
        uuid requestId FK
        enum decisionType "REQUEST_COMPLEMENT | RECOMMEND_APPROVAL | APPROVE | REJECT"
        text motive "Mandatory reason"
        int targetVersion "Optimistic lock verification"
        uuid actorId FK
        enum actorRole "CONSEILLER | SUPERVISEUR"
        timestamp createdAt
    }

    BankingActivation {
        uuid id PK
        uuid requestId FK
        string idempotencyKey UK
        int attemptNumber "Default: 1"
        enum status "PENDING | SUCCESS | FAILED"
        string failureReason "Nullable"
        decimal limitApplied "12, 2"
        timestamp activatedAt "Nullable"
        timestamp restoredAt "Nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    AuditEvent {
        uuid id PK
        uuid actorId FK "Nullable (system actions)"
        string actorEmail "Nullable"
        string actorRole "Nullable"
        string action "e.g. SUBMIT, APPROVE, RESTORE"
        string entityType "LimitRequest | Account | User"
        uuid entityId
        int entityVersion "Nullable"
        string ipAddress "Nullable"
        jsonb details
        timestamp createdAt
    }

    AIConversation {
        uuid id PK
        uuid userId FK
        uuid accountId FK "Nullable"
        string title "Nullable"
        timestamp createdAt
        timestamp updatedAt
    }

    AIMessage {
        uuid id PK
        uuid conversationId FK
        enum role "user | assistant | system | tool"
        text content
        jsonb toolCalls "Nullable"
        jsonb toolResults "Nullable"
        timestamp createdAt
    }
```

---

## 3. Key Enums & Constraints

### 3.1 Role & Status Enums
```prisma
enum Role {
  CLIENT
  CONSEILLER
  SUPERVISEUR
  ADMIN
}

enum CustomerFileStatus {
  COMPLETE
  INCOMPLETE
}

enum LimitRequestStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  COMPLEMENT_REQUESTED
  PENDING_SUPERVISOR
  APPROVED_PENDING_ACTIVATION
  ACTIVE
  ACTIVATION_FAILED
  REJECTED
  CANCELLED
  EXPIRED
}

enum DecisionType {
  REQUEST_COMPLEMENT
  RECOMMEND_APPROVAL
  APPROVE
  REJECT
}

enum ActivationStatus {
  PENDING
  SUCCESS
  FAILED
}
```

### 3.2 Single Active Request Invariant Enforcement
To enforce that an account cannot have multiple requests in-flight or an active limit concurrently, PostgreSQL partial indexing or application-level serializable locks are used:
```sql
-- Partial unique index guaranteeing at most ONE request in progress or active per account:
CREATE UNIQUE INDEX idx_single_in_progress_or_active_request_per_account
ON "LimitRequest" ("accountId")
WHERE "status" IN (
  'SUBMITTED',
  'UNDER_REVIEW',
  'COMPLEMENT_REQUESTED',
  'PENDING_SUPERVISOR',
  'APPROVED_PENDING_ACTIVATION',
  'ACTIVE'
);
```

---

## 4. Migration & Seeding Strategy

1. **Prisma Migrations:** Fully declarative migrations in `prisma/migrations`.
2. **Deterministic Seed Data:**
   - 3 Customers (`client1@proorga.bank`, `client2@proorga.bank`, `client3@proorga.bank` with an incomplete file).
   - 2 Advisors (`conseiller1@proorga.bank`, `conseiller2@proorga.bank`).
   - 2 Supervisors (`superviseur1@proorga.bank`, `superviseur2@proorga.bank`).
   - 1 Administrator (`admin@proorga.bank`).
   - Pre-populated requests across all workflow stages (Draft, Under Review, Escalated, Active, and Expired).
