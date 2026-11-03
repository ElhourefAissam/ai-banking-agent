import { z } from 'zod';
import {
  BANKING_RULES,
  Role,
  DecisionType,
  SimulationFailureMode,
} from '@proorga/shared-types';

/**
 * Authentication Schemas
 */
export const LoginSchema = z.object({
  email: z.string().email('Email invalid'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Limit Request Validation Rules
 */
export const CreateDraftSchema = z.object({
  accountId: z.string().uuid('Account ID must be a valid UUID'),
  requestedLimit: z
    .number()
    .min(
      BANKING_RULES.MIN_REQUESTED_LIMIT,
      `Requested limit must be strictly greater than ${BANKING_RULES.INITIAL_TRANSFER_LIMIT} DH`
    )
    .max(
      BANKING_RULES.MAX_REQUESTED_LIMIT,
      `Requested limit cannot exceed ${BANKING_RULES.MAX_REQUESTED_LIMIT} DH`
    ),
  durationDays: z
    .number()
    .int('Duration must be an integer number of days')
    .min(
      BANKING_RULES.MIN_DURATION_DAYS,
      `Duration must be at least ${BANKING_RULES.MIN_DURATION_DAYS} day`
    )
    .max(
      BANKING_RULES.MAX_DURATION_DAYS,
      `Duration cannot exceed ${BANKING_RULES.MAX_DURATION_DAYS} days`
    ),
  reason: z
    .string()
    .trim()
    .min(5, 'Reason must be at least 5 characters long')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export const UpdateDraftSchema = z.object({
  requestedLimit: z
    .number()
    .min(BANKING_RULES.MIN_REQUESTED_LIMIT)
    .max(BANKING_RULES.MAX_REQUESTED_LIMIT)
    .optional(),
  durationDays: z
    .number()
    .int()
    .min(BANKING_RULES.MIN_DURATION_DAYS)
    .max(BANKING_RULES.MAX_DURATION_DAYS)
    .optional(),
  reason: z.string().trim().min(5).max(500).optional(),
  targetVersion: z.number().int().min(1, 'Target version must be a positive integer'),
});

export const SubmitRequestSchema = z.object({
  targetVersion: z.number().int().min(1, 'Target version must be a positive integer'),
});

export const MotivatedDecisionSchema = z.object({
  motive: z
    .string()
    .trim()
    .min(5, 'A detailed motive of at least 5 characters is mandatory')
    .max(1000, 'Motive cannot exceed 1000 characters'),
  targetVersion: z.number().int().min(1, 'Target version must be a positive integer'),
});

export const RespondComplementSchema = z.object({
  additionalExplanation: z
    .string()
    .trim()
    .min(5, 'Please provide an explanation of at least 5 characters')
    .max(1000)
    .optional(),
  requestedLimit: z
    .number()
    .min(BANKING_RULES.MIN_REQUESTED_LIMIT)
    .max(BANKING_RULES.MAX_REQUESTED_LIMIT)
    .optional(),
  durationDays: z
    .number()
    .int()
    .min(BANKING_RULES.MIN_DURATION_DAYS)
    .max(BANKING_RULES.MAX_DURATION_DAYS)
    .optional(),
  targetVersion: z.number().int().min(1, 'Target version must be a positive integer'),
});

export const SimulationFailureOverrideSchema = z.object({
  mode: z.nativeEnum(SimulationFailureMode),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateDraftInput = z.infer<typeof CreateDraftSchema>;
export type UpdateDraftInput = z.infer<typeof UpdateDraftSchema>;
export type SubmitRequestInput = z.infer<typeof SubmitRequestSchema>;
export type MotivatedDecisionInput = z.infer<typeof MotivatedDecisionSchema>;
export type RespondComplementInput = z.infer<typeof RespondComplementSchema>;
