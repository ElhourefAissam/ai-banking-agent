import { z } from 'zod';
import { SimulationFailureMode } from '@proorga/shared-types';
/**
 * Authentication Schemas
 */
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
/**
 * Limit Request Validation Rules
 */
export declare const CreateDraftSchema: z.ZodObject<{
    accountId: z.ZodString;
    requestedLimit: z.ZodNumber;
    durationDays: z.ZodNumber;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accountId: string;
    requestedLimit: number;
    durationDays: number;
    reason: string;
}, {
    accountId: string;
    requestedLimit: number;
    durationDays: number;
    reason: string;
}>;
export declare const UpdateDraftSchema: z.ZodObject<{
    requestedLimit: z.ZodOptional<z.ZodNumber>;
    durationDays: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodOptional<z.ZodString>;
    targetVersion: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    targetVersion: number;
    requestedLimit?: number | undefined;
    durationDays?: number | undefined;
    reason?: string | undefined;
}, {
    targetVersion: number;
    requestedLimit?: number | undefined;
    durationDays?: number | undefined;
    reason?: string | undefined;
}>;
export declare const SubmitRequestSchema: z.ZodObject<{
    targetVersion: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    targetVersion: number;
}, {
    targetVersion: number;
}>;
export declare const MotivatedDecisionSchema: z.ZodObject<{
    motive: z.ZodString;
    targetVersion: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    targetVersion: number;
    motive: string;
}, {
    targetVersion: number;
    motive: string;
}>;
export declare const RespondComplementSchema: z.ZodObject<{
    additionalExplanation: z.ZodOptional<z.ZodString>;
    requestedLimit: z.ZodOptional<z.ZodNumber>;
    durationDays: z.ZodOptional<z.ZodNumber>;
    targetVersion: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    targetVersion: number;
    requestedLimit?: number | undefined;
    durationDays?: number | undefined;
    additionalExplanation?: string | undefined;
}, {
    targetVersion: number;
    requestedLimit?: number | undefined;
    durationDays?: number | undefined;
    additionalExplanation?: string | undefined;
}>;
export declare const SimulationFailureOverrideSchema: z.ZodObject<{
    mode: z.ZodNativeEnum<typeof SimulationFailureMode>;
}, "strip", z.ZodTypeAny, {
    mode: SimulationFailureMode;
}, {
    mode: SimulationFailureMode;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateDraftInput = z.infer<typeof CreateDraftSchema>;
export type UpdateDraftInput = z.infer<typeof UpdateDraftSchema>;
export type SubmitRequestInput = z.infer<typeof SubmitRequestSchema>;
export type MotivatedDecisionInput = z.infer<typeof MotivatedDecisionSchema>;
export type RespondComplementInput = z.infer<typeof RespondComplementSchema>;
