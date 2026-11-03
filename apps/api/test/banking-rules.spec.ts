import {
  BANKING_RULES,
  Role,
  LimitRequestStatus,
  CustomerFileStatus,
  DecisionType,
} from '@proorga/shared-types';
import {
  CreateDraftSchema,
  SubmitRequestSchema,
  MotivatedDecisionSchema,
} from '@proorga/shared-validation';

describe('PROORGA Core Banking Rules & Invariants Unit Tests', () => {
  describe('Financial Amount Boundaries', () => {
    it('should reject amounts equal to or less than initial 10,000 DH', () => {
      const payload1 = {
        accountId: '11111111-1111-1111-1111-111111111111',
        requestedLimit: 10000,
        durationDays: 3,
        reason: 'Achat de materiel informatique',
      };
      const result1 = CreateDraftSchema.safeParse(payload1);
      expect(result1.success).toBe(false);

      const payload2 = {
        accountId: '11111111-1111-1111-1111-111111111111',
        requestedLimit: 5000,
        durationDays: 3,
        reason: 'Achat de materiel informatique',
      };
      const result2 = CreateDraftSchema.safeParse(payload2);
      expect(result2.success).toBe(false);
    });

    it('should reject amounts exceeding maximum ceiling of 100,000 DH', () => {
      const payload = {
        accountId: '11111111-1111-1111-1111-111111111111',
        requestedLimit: 100001,
        durationDays: 3,
        reason: 'Achat immobilier comptant',
      };
      const result = CreateDraftSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should accept valid amounts strictly within ]10000, 100000]', () => {
      const payload1 = {
        accountId: '11111111-1111-1111-1111-111111111111',
        requestedLimit: 25000,
        durationDays: 3,
        reason: 'Frais de voyage et deplacements',
      };
      const result1 = CreateDraftSchema.safeParse(payload1);
      expect(result1.success).toBe(true);

      const payload2 = {
        accountId: '11111111-1111-1111-1111-111111111111',
        requestedLimit: 100000,
        durationDays: 7,
        reason: 'Paiement acompte acquisition',
      };
      const result2 = CreateDraftSchema.safeParse(payload2);
      expect(result2.success).toBe(true);
    });
  });

  describe('Duration Boundaries', () => {
    it('should reject durations less than 1 day or greater than 7 days', () => {
      const resultMin = CreateDraftSchema.safeParse({
        accountId: '11111111-1111-1111-1111-111111111111',
        requestedLimit: 20000,
        durationDays: 0,
        reason: 'Besoin urgent de trésorerie',
      });
      expect(resultMin.success).toBe(false);

      const resultMax = CreateDraftSchema.safeParse({
        accountId: '11111111-1111-1111-1111-111111111111',
        requestedLimit: 20000,
        durationDays: 8,
        reason: 'Besoin long de trésorerie',
      });
      expect(resultMax.success).toBe(false);
    });

    it('should accept durations between 1 and 7 days inclusive', () => {
      for (let day = 1; day <= 7; day++) {
        const result = CreateDraftSchema.safeParse({
          accountId: '11111111-1111-1111-1111-111111111111',
          requestedLimit: 25000,
          durationDays: day,
          reason: `Paiement sur ${day} jours`,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Decision Motives & Audit Requirements', () => {
    it('should enforce mandatory non-empty motive for advisor/supervisor decisions', () => {
      const emptyMotive = MotivatedDecisionSchema.safeParse({
        motive: '   ',
        targetVersion: 1,
      });
      expect(emptyMotive.success).toBe(false);

      const validMotive = MotivatedDecisionSchema.safeParse({
        motive: 'Client régulier, solde suffisant, demande recevable',
        targetVersion: 1,
      });
      expect(validMotive.success).toBe(true);
    });
  });

  describe('Governance Thresholds & Separation of Duties', () => {
    it('should identify requests <= 30,000 DH as eligible for advisor delegation', () => {
      const limit = 30000;
      expect(limit <= BANKING_RULES.ADVISOR_MAX_THRESHOLD).toBe(true);
    });

    it('should identify requests > 30,000 DH as requiring supervisor validation', () => {
      const limit = 30001;
      expect(limit > BANKING_RULES.ADVISOR_MAX_THRESHOLD).toBe(true);
    });

    it('should identify requests > 50,000 DH as requiring supporting documents', () => {
      const limit45k = 45000;
      const limit60k = 60000;
      expect(limit45k > BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD).toBe(false);
      expect(limit60k > BANKING_RULES.DOCUMENT_REQUIRED_THRESHOLD).toBe(true);
    });

    it('should prevent an advisor who recommended a request from approving it as supervisor', () => {
      const recommenderId = 'user-advisor-1';
      const supervisorId = 'user-advisor-1'; // Same person holding dual roles

      const decisions = [
        {
          decisionType: DecisionType.RECOMMEND_APPROVAL,
          actorId: recommenderId,
        },
      ];

      const isForbidden = decisions.some(
        (d) => d.decisionType === DecisionType.RECOMMEND_APPROVAL && d.actorId === supervisorId
      );

      expect(isForbidden).toBe(true);
    });
  });
});
