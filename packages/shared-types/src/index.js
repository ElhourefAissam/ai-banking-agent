"use strict";
/**
 * PROORGA Banking Platform — Shared Domain Types & Enums
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIMessageRole = exports.SimulationFailureMode = exports.ActivationStatus = exports.DecisionType = exports.LimitRequestStatus = exports.CustomerFileStatus = exports.Role = exports.BANKING_RULES = void 0;
// =============================================================================
// Business Constants
// =============================================================================
exports.BANKING_RULES = {
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
};
// =============================================================================
// Domain Enums
// =============================================================================
var Role;
(function (Role) {
    Role["CLIENT"] = "CLIENT";
    Role["CONSEILLER"] = "CONSEILLER";
    Role["SUPERVISEUR"] = "SUPERVISEUR";
    Role["ADMIN"] = "ADMIN";
})(Role || (exports.Role = Role = {}));
var CustomerFileStatus;
(function (CustomerFileStatus) {
    CustomerFileStatus["COMPLETE"] = "COMPLETE";
    CustomerFileStatus["INCOMPLETE"] = "INCOMPLETE";
})(CustomerFileStatus || (exports.CustomerFileStatus = CustomerFileStatus = {}));
var LimitRequestStatus;
(function (LimitRequestStatus) {
    LimitRequestStatus["DRAFT"] = "DRAFT";
    LimitRequestStatus["SUBMITTED"] = "SUBMITTED";
    LimitRequestStatus["UNDER_REVIEW"] = "UNDER_REVIEW";
    LimitRequestStatus["COMPLEMENT_REQUESTED"] = "COMPLEMENT_REQUESTED";
    LimitRequestStatus["PENDING_SUPERVISOR"] = "PENDING_SUPERVISOR";
    LimitRequestStatus["APPROVED_PENDING_ACTIVATION"] = "APPROVED_PENDING_ACTIVATION";
    LimitRequestStatus["ACTIVE"] = "ACTIVE";
    LimitRequestStatus["ACTIVATION_FAILED"] = "ACTIVATION_FAILED";
    LimitRequestStatus["REJECTED"] = "REJECTED";
    LimitRequestStatus["CANCELLED"] = "CANCELLED";
    LimitRequestStatus["EXPIRED"] = "EXPIRED";
})(LimitRequestStatus || (exports.LimitRequestStatus = LimitRequestStatus = {}));
var DecisionType;
(function (DecisionType) {
    DecisionType["REQUEST_COMPLEMENT"] = "REQUEST_COMPLEMENT";
    DecisionType["RECOMMEND_APPROVAL"] = "RECOMMEND_APPROVAL";
    DecisionType["APPROVE"] = "APPROVE";
    DecisionType["REJECT"] = "REJECT";
})(DecisionType || (exports.DecisionType = DecisionType = {}));
var ActivationStatus;
(function (ActivationStatus) {
    ActivationStatus["PENDING"] = "PENDING";
    ActivationStatus["SUCCESS"] = "SUCCESS";
    ActivationStatus["FAILED"] = "FAILED";
})(ActivationStatus || (exports.ActivationStatus = ActivationStatus = {}));
var SimulationFailureMode;
(function (SimulationFailureMode) {
    SimulationFailureMode["NONE"] = "NONE";
    SimulationFailureMode["NETWORK_TIMEOUT"] = "NETWORK_TIMEOUT";
    SimulationFailureMode["LOST_ACK"] = "LOST_ACK";
    SimulationFailureMode["BANK_500"] = "BANK_500";
})(SimulationFailureMode || (exports.SimulationFailureMode = SimulationFailureMode = {}));
var AIMessageRole;
(function (AIMessageRole) {
    AIMessageRole["USER"] = "user";
    AIMessageRole["ASSISTANT"] = "assistant";
    AIMessageRole["SYSTEM"] = "system";
    AIMessageRole["TOOL"] = "tool";
})(AIMessageRole || (exports.AIMessageRole = AIMessageRole = {}));
