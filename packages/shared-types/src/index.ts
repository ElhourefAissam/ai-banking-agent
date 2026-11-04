/**
 * PROORGA Banking Platform — Shared Domain Types & Enums
 */

// =============================================================================
// Business Constants
// =============================================================================

export const BANKING_RULES = {
  INITIAL_TRANSFER_LIMIT: 10000,
  MIN_REQUESTED_LIMIT: 10001,
  MAX_REQUESTED_LIMIT: 100000,
  ADVISOR_MAX_THRESHOLD: 30000,
  DOCUMENT_REQUIRED_THRESHOLD: 50000,
  MIN_DURATION_DAYS: 1,
  MAX_DURATION_DAYS: 7,
  CURRENCY_CODE: 'MAD',
  CURRENCY_SYMBOL_FR: 'DH',
  CURRENCY_SYMBOL_AR: 'د.م.',
} as const;

// =============================================================================
// Domain Enums
// =============================================================================

export enum Role {
  CLIENT = 'CLIENT',
  CONSEILLER = 'CONSEILLER',
  SUPERVISEUR = 'SUPERVISEUR',
  ADMIN = 'ADMIN',
}

export enum CustomerFileStatus {
  COMPLETE = 'COMPLETE',
  INCOMPLETE = 'INCOMPLETE',
}

export enum LimitRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLEMENT_REQUESTED = 'COMPLEMENT_REQUESTED',
  PENDING_SUPERVISOR = 'PENDING_SUPERVISOR',
  APPROVED_PENDING_ACTIVATION = 'APPROVED_PENDING_ACTIVATION',
  ACTIVE = 'ACTIVE',
  ACTIVATION_FAILED = 'ACTIVATION_FAILED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum DecisionType {
  REQUEST_COMPLEMENT = 'REQUEST_COMPLEMENT',
  RECOMMEND_APPROVAL = 'RECOMMEND_APPROVAL',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum ActivationStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum SimulationFailureMode {
  NONE = 'NONE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  LOST_ACK = 'LOST_ACK',
  BANK_500 = 'BANK_500',
}

export enum AIMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL = 'tool',
}

// =============================================================================
// Entity Interfaces
// =============================================================================

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  portfolioId?: string | null;
  teamId?: string | null;
}

export interface CustomerProfileSummary {
  id: string;
  userId: string;
  cin: string;
  fileStatus: CustomerFileStatus;
  incompleteReason?: string | null;
  address: string;
  phone: string;
}

export interface BankAccountSummary {
  id: string;
  customerProfileId: string;
  accountNumber: string;
  iban: string;
  balance: number;
  initialTransferLimit: number;
  currentTransferLimit: number;
  currency: string;
  activeLimitExpiry?: string | null;
}

export interface RequestDocumentSummary {
  id: string;
  requestId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface DecisionRecord {
  id: string;
  requestId: string;
  decisionType: DecisionType;
  motive: string;
  targetVersion: number;
  actorId: string;
  actorEmail?: string;
  actorName?: string;
  actorRole: Role;
  createdAt: string;
}

export interface RequestVersionRecord {
  id: string;
  requestId: string;
  versionNumber: number;
  snapshot: Record<string, any>;
  changeReason?: string | null;
  createdById: string;
  createdAt: string;
}

export interface LimitRequestDetail {
  id: string;
  reference: string;
  accountId: string;
  customerProfileId: string;
  initialLimit: number;
  requestedLimit: number;
  durationDays: number;
  reason: string;
  status: LimitRequestStatus;
  version: number;
  assignedAdvisorId?: string | null;
  requiredDocumentsProvided: boolean;
  activeFrom?: string | null;
  activeUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  account?: BankAccountSummary;
  customerProfile?: CustomerProfileSummary & { user?: UserSummary };
  documents?: RequestDocumentSummary[];
  decisions?: DecisionRecord[];
  versions?: RequestVersionRecord[];
  activations?: BankingActivationRecord[];
}

export interface BankingActivationRecord {
  id: string;
  requestId: string;
  idempotencyKey: string;
  attemptNumber: number;
  status: ActivationStatus;
  failureReason?: string | null;
  limitApplied: number;
  activatedAt?: string | null;
  restoredAt?: string | null;
  createdAt: string;
}

export interface AuditEventRecord {
  id: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  entityVersion?: number | null;
  ipAddress?: string | null;
  details?: Record<string, any>;
  createdAt: string;
}

// =============================================================================
// AI Tool Calling & Interaction Types
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolCallPayload {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResultPayload {
  toolCallId: string;
  output: any;
  error?: string;
}

export interface ConfirmationMetadata {
  requiresConfirmation: boolean;
  action: 'submit_limit_request';
  parameters: {
    requestId: string;
    requestedLimit: number;
    durationDays: number;
    reason: string;
    targetVersion: number;
  };
  hash: string;
}

export interface ChatMessage {
  id?: string;
  role: AIMessageRole;
  content: string;
  toolCalls?: ToolCallPayload[];
  toolResults?: ToolResultPayload[];
  confirmationMetadata?: ConfirmationMetadata;
  createdAt?: string;
}

// =============================================================================
// API Request & Response Contracts
// =============================================================================

export interface LoginRequestDto {
  email: string;
  password?: string;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserSummary;
}

export interface CreateDraftRequestDto {
  accountId: string;
  requestedLimit: number;
  durationDays: number;
  reason: string;
}

export interface UpdateDraftRequestDto {
  requestedLimit?: number;
  durationDays?: number;
  reason?: string;
  targetVersion: number;
}

export interface SubmitRequestDto {
  targetVersion: number;
}

export interface MotivatedDecisionDto {
  motive: string;
  targetVersion: number;
}

export interface RespondComplementDto {
  additionalExplanation?: string;
  requestedLimit?: number;
  durationDays?: number;
  targetVersion: number;
}

export type CreateDraftInput = CreateDraftRequestDto;
export type UpdateDraftInput = UpdateDraftRequestDto;
export type SubmitRequestInput = SubmitRequestDto;
export type MotivatedDecisionInput = MotivatedDecisionDto;
export type RespondComplementInput = RespondComplementDto;

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
  currentLimit: number;
  customerFileStatus: CustomerFileStatus;
  hasActiveRequest: boolean;
  activeRequestId?: string;
}
