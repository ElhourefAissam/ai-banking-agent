import { CertificateService } from '../src/modules/requests/certificate.service';
import { Role, LimitRequestStatus } from '@proorga/shared-types';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('CertificateService Unit Tests', () => {
  let certificateService: CertificateService;
  let mockPrisma: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      limitRequest: {
        findFirst: jest.fn(),
      },
    };
    mockAudit = {
      logEvent: jest.fn().mockResolvedValue(true),
    };
    certificateService = new CertificateService(mockPrisma as any, mockAudit as any);
  });

  describe('Public Verification (verifyCertificate)', () => {
    it('should return isValid: false when reference does not exist in registry', async () => {
      mockPrisma.limitRequest.findFirst.mockResolvedValue(null);

      const result = await certificateService.verifyCertificate('REQ-UNKNOWN-999');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Aucun document');
    });

    it('should return masked holder name and valid status for an active request', async () => {
      mockPrisma.limitRequest.findFirst.mockResolvedValue({
        reference: 'REQ-2026-0001',
        status: LimitRequestStatus.ACTIVE,
        requestedLimit: 25000,
        initialLimit: 10000,
        durationDays: 3,
        activeFrom: new Date('2026-11-04T10:00:00Z'),
        activeUntil: new Date('2026-11-07T10:00:00Z'),
        updatedAt: new Date('2026-11-04T10:00:00Z'),
        customerProfile: {
          user: {
            firstName: 'Karim',
            lastName: 'Alami',
          },
        },
        account: {
          accountNumber: '230010000000123456789012',
          iban: 'MA64230010000000123456789012',
        },
      });

      const result = await certificateService.verifyCertificate('REQ-2026-0001');
      expect(result.isValid).toBe(true);
      expect(result.reference).toBe('REQ-2026-0001');
      expect(result.status).toBe(LimitRequestStatus.ACTIVE);
      expect(result.holderMaskedName).toBe('A**** K****');
      expect(result.accountMasked).toBe('****9012');
      expect(result.requestedLimit).toBe(25000);
    });
  });

  describe('PDF Generation (generateCertificatePdf)', () => {
    const mockActiveRequest = {
      id: 'req-1',
      reference: 'REQ-2026-0001',
      status: LimitRequestStatus.ACTIVE,
      initialLimit: 10000,
      requestedLimit: 25000,
      durationDays: 3,
      reason: 'Achat materiel informatique',
      version: 2,
      activeFrom: new Date('2026-11-04T10:00:00Z'),
      activeUntil: new Date('2026-11-07T10:00:00Z'),
      customerProfile: {
        userId: 'client-user-1',
        cin: 'AB123456',
        user: {
          firstName: 'Karim',
          lastName: 'Alami',
        },
      },
      account: {
        accountNumber: '230010000000123456789012',
        iban: 'MA64230010000000123456789012',
      },
      decisions: [
        {
          decisionType: 'APPROVE',
          actor: {
            firstName: 'Hassan',
            lastName: 'Benali',
            role: 'CONSEILLER',
          },
        },
      ],
      activations: [],
    };

    it('should throw NotFoundException if request is not found', async () => {
      mockPrisma.limitRequest.findFirst.mockResolvedValue(null);

      await expect(
        certificateService.generateCertificatePdf('missing-id', {
          id: 'client-user-1',
          email: 'client@proorga.bank',
          firstName: 'Karim',
          lastName: 'Alami',
          role: Role.CLIENT,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce IDOR protection against client requesting another user certificate', async () => {
      mockPrisma.limitRequest.findFirst.mockResolvedValue(mockActiveRequest);

      await expect(
        certificateService.generateCertificatePdf('req-1', {
          id: 'other-client-id',
          email: 'intruder@proorga.bank',
          firstName: 'Other',
          lastName: 'Client',
          role: Role.CLIENT,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-eligible request status (e.g. DRAFT or PENDING_SUPERVISOR)', async () => {
      mockPrisma.limitRequest.findFirst.mockResolvedValue({
        ...mockActiveRequest,
        status: LimitRequestStatus.SUBMITTED,
      });

      await expect(
        certificateService.generateCertificatePdf('req-1', {
          id: 'client-user-1',
          email: 'client@proorga.bank',
          firstName: 'Karim',
          lastName: 'Alami',
          role: Role.CLIENT,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully generate an official PDF stream for eligible request', async () => {
      mockPrisma.limitRequest.findFirst.mockResolvedValue(mockActiveRequest);

      const result = await certificateService.generateCertificatePdf('req-1', {
        id: 'client-user-1',
        email: 'client@proorga.bank',
        firstName: 'Karim',
        lastName: 'Alami',
        role: Role.CLIENT,
      });

      expect(result).toBeDefined();
      expect(result.fileName).toBe('Attestation_Plafond_REQ-2026-0001.pdf');
      expect(result.reference).toBe('REQ-2026-0001');
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(1000);
      expect(result.buffer.toString('utf8', 0, 5)).toBe('%PDF-');

      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CERTIFICATE_GENERATED',
          entityType: 'LimitRequest',
          entityId: 'req-1',
        })
      );
    });
  });
});
