"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationFailureOverrideSchema = exports.RespondComplementSchema = exports.MotivatedDecisionSchema = exports.SubmitRequestSchema = exports.UpdateDraftSchema = exports.CreateDraftSchema = exports.LoginSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@proorga/shared-types");
/**
 * Authentication Schemas
 */
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email invalid'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
/**
 * Limit Request Validation Rules
 */
exports.CreateDraftSchema = zod_1.z.object({
    accountId: zod_1.z.string().uuid('Account ID must be a valid UUID'),
    requestedLimit: zod_1.z
        .number()
        .min(shared_types_1.BANKING_RULES.MIN_REQUESTED_LIMIT, `Requested limit must be strictly greater than ${shared_types_1.BANKING_RULES.INITIAL_TRANSFER_LIMIT} DH`)
        .max(shared_types_1.BANKING_RULES.MAX_REQUESTED_LIMIT, `Requested limit cannot exceed ${shared_types_1.BANKING_RULES.MAX_REQUESTED_LIMIT} DH`),
    durationDays: zod_1.z
        .number()
        .int('Duration must be an integer number of days')
        .min(shared_types_1.BANKING_RULES.MIN_DURATION_DAYS, `Duration must be at least ${shared_types_1.BANKING_RULES.MIN_DURATION_DAYS} day`)
        .max(shared_types_1.BANKING_RULES.MAX_DURATION_DAYS, `Duration cannot exceed ${shared_types_1.BANKING_RULES.MAX_DURATION_DAYS} days`),
    reason: zod_1.z
        .string()
        .trim()
        .min(5, 'Reason must be at least 5 characters long')
        .max(500, 'Reason cannot exceed 500 characters'),
});
exports.UpdateDraftSchema = zod_1.z.object({
    requestedLimit: zod_1.z
        .number()
        .min(shared_types_1.BANKING_RULES.MIN_REQUESTED_LIMIT)
        .max(shared_types_1.BANKING_RULES.MAX_REQUESTED_LIMIT)
        .optional(),
    durationDays: zod_1.z
        .number()
        .int()
        .min(shared_types_1.BANKING_RULES.MIN_DURATION_DAYS)
        .max(shared_types_1.BANKING_RULES.MAX_DURATION_DAYS)
        .optional(),
    reason: zod_1.z.string().trim().min(5).max(500).optional(),
    targetVersion: zod_1.z.number().int().min(1, 'Target version must be a positive integer'),
});
exports.SubmitRequestSchema = zod_1.z.object({
    targetVersion: zod_1.z.number().int().min(1, 'Target version must be a positive integer'),
});
exports.MotivatedDecisionSchema = zod_1.z.object({
    motive: zod_1.z
        .string()
        .trim()
        .min(5, 'A detailed motive of at least 5 characters is mandatory')
        .max(1000, 'Motive cannot exceed 1000 characters'),
    targetVersion: zod_1.z.number().int().min(1, 'Target version must be a positive integer'),
});
exports.RespondComplementSchema = zod_1.z.object({
    additionalExplanation: zod_1.z
        .string()
        .trim()
        .min(5, 'Please provide an explanation of at least 5 characters')
        .max(1000)
        .optional(),
    requestedLimit: zod_1.z
        .number()
        .min(shared_types_1.BANKING_RULES.MIN_REQUESTED_LIMIT)
        .max(shared_types_1.BANKING_RULES.MAX_REQUESTED_LIMIT)
        .optional(),
    durationDays: zod_1.z
        .number()
        .int()
        .min(shared_types_1.BANKING_RULES.MIN_DURATION_DAYS)
        .max(shared_types_1.BANKING_RULES.MAX_DURATION_DAYS)
        .optional(),
    targetVersion: zod_1.z.number().int().min(1, 'Target version must be a positive integer'),
});
exports.SimulationFailureOverrideSchema = zod_1.z.object({
    mode: zod_1.z.nativeEnum(shared_types_1.SimulationFailureMode),
});
