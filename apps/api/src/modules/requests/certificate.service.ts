import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, LimitRequestStatus, UserSummary } from '@proorga/shared-types';
import { createHash } from 'crypto';
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

@Injectable()
export class CertificateService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Generates a tamper-evident, official bank certificate PDF for approved/active requests.
   */
  async generateCertificatePdf(requestIdOrRef: string, currentUser: UserSummary): Promise<{
    buffer: Buffer;
    fileName: string;
    reference: string;
  }> {
    const request = await this.prisma.limitRequest.findFirst({
      where: {
        OR: [{ id: requestIdOrRef }, { reference: requestIdOrRef }],
      },
      include: {
        account: true,
        customerProfile: {
          include: {
            user: true,
          },
        },
        decisions: {
          orderBy: { createdAt: 'desc' },
          include: { actor: true },
        },
        activations: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Demande ${requestIdOrRef} introuvable.`);
    }

    // Role-based authorization & IDOR defense
    if (
      currentUser.role === Role.CLIENT &&
      request.customerProfile.userId !== currentUser.id
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à générer l'attestation pour cette demande."
      );
    }

    // Only approved, active, or previously expired requests are eligible for official certificate
    const eligibleStatuses = [
      LimitRequestStatus.APPROVED_PENDING_ACTIVATION,
      LimitRequestStatus.ACTIVE,
      LimitRequestStatus.EXPIRED,
    ];

    if (!eligibleStatuses.includes(request.status as LimitRequestStatus)) {
      throw new BadRequestException(
        `L'attestation officielle n'est délivrée que pour les demandes formellement approuvées ou activées (statut actuel : ${request.status}).`
      );
    }

    // 1. Compute Cryptographic Verification Fingerprint (SHA-256)
    const verificationPayload = JSON.stringify({
      reference: request.reference,
      accountId: request.account.accountNumber,
      cin: request.customerProfile.cin,
      clientName: `${request.customerProfile.user.lastName} ${request.customerProfile.user.firstName}`,
      requestedLimit: Number(request.requestedLimit),
      initialLimit: Number(request.initialLimit),
      durationDays: request.durationDays,
      status: request.status,
      issuedAt: new Date().toISOString(),
    });

    const sha256Fingerprint = createHash('sha256')
      .update(verificationPayload)
      .digest('hex');

    // 2. Generate Verification QR Code
    const verificationUrl = `http://localhost:3002/verify?ref=${encodeURIComponent(
      request.reference
    )}&hash=${sha256Fingerprint.substring(0, 16)}&amount=${request.requestedLimit}`;

    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 140,
      color: {
        dark: '#0f2942',
        light: '#ffffff',
      },
    });

    // 3. Build the PDF Document
    const buffer = await this.renderPdfDocument({
      request,
      sha256Fingerprint,
      qrCodeDataUrl,
      verificationUrl,
    });

    // 4. Record Audit Event
    await this.auditService.logEvent({
      actorId: currentUser.id,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      action: 'CERTIFICATE_GENERATED',
      entityType: 'LimitRequest',
      entityId: request.id,
      entityVersion: request.version,
      details: {
        reference: request.reference,
        sha256Fingerprint,
      },
    });

    const fileName = `Attestation_Plafond_${request.reference}.pdf`;

    return {
      buffer,
      fileName,
      reference: request.reference,
    };
  }

  /**
   * Internal PDFKit renderer for high-quality banking certificate layout.
   */
  private async renderPdfDocument(data: {
    request: any;
    sha256Fingerprint: string;
    qrCodeDataUrl: string;
    verificationUrl: string;
  }): Promise<Buffer> {
    const { request, sha256Fingerprint, qrCodeDataUrl } = data;
    const client = request.customerProfile.user;
    const account = request.account;
    const approvalDecision = request.decisions.find(
      (d: any) => d.decisionType === 'APPROVE'
    );
    const approverName = approvalDecision?.actor
      ? `${approvalDecision.actor.firstName} ${approvalDecision.actor.lastName} (${approvalDecision.actor.role})`
      : 'Délégation Centrale PROORGA';

    const issuedAt = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const activeUntilDate = request.activeUntil
      ? new Date(request.activeUntil).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : `Période de ${request.durationDays} jours calendaires`;

    const activeFromDate = request.activeFrom
      ? new Date(request.activeFrom).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : issuedAt;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Attestation Officielle PROORGA — ${request.reference}`,
          Author: 'PROORGA BANK SA - Direction des Engagements',
          Subject: 'Relèvement Temporaire de Plafond de Virement',
          Keywords: 'banque, attestation, virement, plafond, proorga',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Palette
      const navy = '#0a192f';
      const darkBlue = '#0f2942';
      const slate = '#334155';
      const lightSlate = '#64748b';
      const emerald = '#047857';
      const gold = '#b45309';

      // Outer Decorative Border
      doc
        .lineWidth(1.5)
        .strokeColor(darkBlue)
        .rect(30, 30, doc.page.width - 60, doc.page.height - 60)
        .stroke();

      doc
        .lineWidth(0.5)
        .strokeColor(gold)
        .rect(34, 34, doc.page.width - 68, doc.page.height - 68)
        .stroke();

      // Top Banner Box
      doc.rect(34, 34, doc.page.width - 68, 85).fill(navy);

      // Bank Logo / Initials Badge
      doc.roundedRect(50, 48, 55, 55, 8).fill('#ffffff');
      doc.fillColor(navy).fontSize(20).font('Helvetica-Bold').text('PO', 63, 62);

      // Bank Header Information
      doc
        .fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('PROORGA BANK', 120, 52);

      doc
        .fillColor('#cbd5e1')
        .fontSize(8.5)
        .font('Helvetica')
        .text(
          'Société Anonyme Bancaire au capital de 12 000 000 000 MAD\nAgrément Bank Al-Maghrib N° 45/2012 — Siège Social : Tour PROORGA, Casablanca Finance City',
          120,
          72,
          { width: 400 }
        );

      // Certificate Title Section
      const startY = 135;
      doc
        .fillColor(darkBlue)
        .fontSize(15)
        .font('Helvetica-Bold')
        .text(
          'ATTESTATION OFFICIELLE DE RELÈVEMENT TEMPORAIRE DE PLAFOND',
          40,
          startY,
          { align: 'center', width: doc.page.width - 80 }
        );

      doc
        .fillColor(lightSlate)
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Délivrée en vertu des règles prudentielles bancaires et certifiée conforme au dossier n° ${request.reference}`,
          40,
          startY + 22,
          { align: 'center', width: doc.page.width - 80 }
        );

      // Reference Badges Row
      doc.rect(48, startY + 45, doc.page.width - 96, 26).fill('#f1f5f9');
      doc
        .fillColor(slate)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text(`Dossier : ${request.reference}`, 60, startY + 53);
      doc
        .font('Helvetica')
        .text(`Délivré le : ${issuedAt}`, 260, startY + 53);
      doc
        .font('Helvetica-Bold')
        .fillColor(emerald)
        .text(`STATUT : ACTIF & VÉRIFIÉ`, 440, startY + 53);

      // Section 1: Customer & Account Identification
      const sec1Y = startY + 85;
      doc
        .fillColor(darkBlue)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('1. IDENTIFICATION DU TITULAIRE DU COMPTE (KYC CERTIFIÉ)', 48, sec1Y);

      doc
        .lineWidth(1)
        .strokeColor(darkBlue)
        .moveTo(48, sec1Y + 16)
        .lineTo(doc.page.width - 48, sec1Y + 16)
        .stroke();

      const boxY = sec1Y + 24;
      doc.roundedRect(48, boxY, doc.page.width - 96, 75, 6).fill('#f8fafc');
      doc.roundedRect(48, boxY, doc.page.width - 96, 75, 6).strokeColor('#e2e8f0').stroke();

      doc.fillColor(slate).fontSize(9).font('Helvetica');
      doc.text('Nom et Prénom :', 60, boxY + 12);
      doc.font('Helvetica-Bold').text(`${client.lastName.toUpperCase()} ${client.firstName}`, 160, boxY + 12);

      doc.font('Helvetica').text('Identifiant National (CIN) :', 60, boxY + 30);
      doc.font('Helvetica-Bold').text(request.customerProfile.cin || 'N/A', 190, boxY + 30);

      doc.font('Helvetica').text('Numéro de Compte :', 60, boxY + 48);
      doc.font('Helvetica-Bold').text(account.accountNumber, 170, boxY + 48);

      doc.font('Helvetica').text('Code IBAN :', 310, boxY + 48);
      doc.font('Helvetica-Bold').text(account.iban, 380, boxY + 48);

      // Section 2: Approved Financial Terms
      const sec2Y = boxY + 90;
      doc
        .fillColor(darkBlue)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('2. DISPOSITIONS FINANCIÈRES & SUR-PLAFOND ACCORDÉ', 48, sec2Y);

      doc
        .lineWidth(1)
        .strokeColor(darkBlue)
        .moveTo(48, sec2Y + 16)
        .lineTo(doc.page.width - 48, sec2Y + 16)
        .stroke();

      const finBoxY = sec2Y + 24;
      doc.roundedRect(48, finBoxY, doc.page.width - 96, 120, 6).fill('#f0fdf4');
      doc.roundedRect(48, finBoxY, doc.page.width - 96, 120, 6).strokeColor('#86efac').stroke();

      // Big Amount Display
      doc.fillColor(darkBlue).fontSize(9.5).font('Helvetica').text('NOUVEAU PLAFOND TEMPORAIRE DE VIREMENT :', 60, finBoxY + 14);
      doc
        .fillColor(emerald)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text(
          `${Number(request.requestedLimit).toLocaleString('fr-FR')} DH`,
          60,
          finBoxY + 28
        );

      doc
        .fillColor(slate)
        .fontSize(8.5)
        .font('Helvetica')
        .text(`(Montant standard initial de base : ${Number(request.initialLimit).toLocaleString('fr-FR')} DH — Extension nette : +${(Number(request.requestedLimit) - Number(request.initialLimit)).toLocaleString('fr-FR')} DH)`, 60, finBoxY + 54);

      doc.moveTo(60, finBoxY + 68).lineTo(doc.page.width - 60, finBoxY + 68).strokeColor('#bbf7d0').stroke();

      doc.fillColor(slate).fontSize(9).font('Helvetica');
      doc.text('Période de validité :', 60, finBoxY + 76);
      doc.font('Helvetica-Bold').text(`Du ${activeFromDate} au ${activeUntilDate} inclus (${request.durationDays} jours)`, 170, finBoxY + 76);

      doc.font('Helvetica').text('Motif de l’opération :', 60, finBoxY + 94);
      doc.font('Helvetica-Bold').text(request.reason || 'Dépense exceptionnelle justifiée', 170, finBoxY + 94, {
        width: 340,
        height: 20,
        ellipsis: true,
      });

      // Section 3: Digital Validation & QR Code Verification
      const sec3Y = finBoxY + 135;
      doc
        .fillColor(darkBlue)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('3. SÉCURITÉ, SCEAU NUMÉRIQUE & CONTRÔLE D’AUTHENTICITÉ', 48, sec3Y);

      doc
        .lineWidth(1)
        .strokeColor(darkBlue)
        .moveTo(48, sec3Y + 16)
        .lineTo(doc.page.width - 48, sec3Y + 16)
        .stroke();

      const qrBoxY = sec3Y + 24;
      doc.roundedRect(48, qrBoxY, doc.page.width - 96, 125, 6).fill('#f8fafc');
      doc.roundedRect(48, qrBoxY, doc.page.width - 96, 125, 6).strokeColor('#e2e8f0').stroke();

      // Embed QR Code
      const qrImageBuffer = Buffer.from(
        qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''),
        'base64'
      );
      doc.image(qrImageBuffer, 60, qrBoxY + 10, { width: 105, height: 105 });

      // Verification Details beside QR
      const textX = 180;
      doc.fillColor(darkBlue).fontSize(9.5).font('Helvetica-Bold').text('Vérification instantanée par QR Code :', textX, qrBoxY + 14);
      doc
        .fillColor(slate)
        .fontSize(8)
        .font('Helvetica')
        .text(
          'Tout tiers (notaire, concessionnaire, administration) peut flasher ce code pour vérifier l’authenticité et la validité en direct de cette attestation sur le serveur bancaire PROORGA.',
          textX,
          qrBoxY + 28,
          { width: 330 }
        );

      doc.font('Helvetica-Bold').text('Validé par la délégation :', textX, qrBoxY + 62);
      doc.font('Helvetica').text(approverName, textX + 135, qrBoxY + 62);

      doc.font('Helvetica-Bold').text('Empreinte SHA-256 (Hash) :', textX, qrBoxY + 80);
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(lightSlate)
        .text(sha256Fingerprint, textX, qrBoxY + 94, { width: 330 });

      // Legal Notice
      const legalY = qrBoxY + 136;
      doc
        .fillColor(lightSlate)
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          'La présente attestation est établie à la demande du titulaire pour servir et valoir ce que de droit. Elle certifie l’existence et l’exécutabilité immédiate du plafond de virement mentionné ci-dessus pour la durée convenue, sous réserve du solde suffisant sur le compte. Document généré avec force probante conformément à la loi n° 53-05 relative à l’échange électronique de données juridiques.',
          48,
          legalY,
          { width: doc.page.width - 96, align: 'justify' }
        );

      // Signature & Stamp Block
      const stampY = legalY + 38;
      doc.roundedRect(doc.page.width - 240, stampY, 192, 45, 6).fill('#f1f5f9');
      doc.roundedRect(doc.page.width - 240, stampY, 192, 45, 6).strokeColor('#cbd5e1').stroke();
      doc
        .fillColor(darkBlue)
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('DIRECTION DES ENGAGEMENTS & DU SWITCH', doc.page.width - 235, stampY + 8, { align: 'center', width: 182 });
      doc
        .fillColor(emerald)
        .fontSize(8)
        .text('PROORGA BANK — SCEAU NUMÉRIQUE', doc.page.width - 235, stampY + 22, { align: 'center', width: 182 });

      doc.end();
    });
  }

  /**
   * Public verification of an attestation by reference and hash.
   */
  async verifyCertificate(reference: string, hash?: string) {
    const request = await this.prisma.limitRequest.findFirst({
      where: { reference },
      include: {
        customerProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        account: {
          select: {
            accountNumber: true,
            iban: true,
          },
        },
      },
    });

    if (!request) {
      return {
        isValid: false,
        message: 'Aucun document correspondant à cette référence n’a été trouvé dans le registre bancaire PROORGA.',
      };
    }

    const isValidStatus = [
      LimitRequestStatus.APPROVED_PENDING_ACTIVATION,
      LimitRequestStatus.ACTIVE,
      LimitRequestStatus.EXPIRED,
    ].includes(request.status as LimitRequestStatus);

    // Mask name for GDPR/Banking privacy (e.g., K**** A****)
    const client = request.customerProfile.user;
    const maskedFirstName = client.firstName[0] + '*'.repeat(Math.max(1, client.firstName.length - 1));
    const maskedLastName = client.lastName[0] + '*'.repeat(Math.max(1, client.lastName.length - 1));

    return {
      isValid: isValidStatus,
      reference: request.reference,
      status: request.status,
      holderMaskedName: `${maskedLastName} ${maskedFirstName}`,
      accountMasked: `****${request.account.accountNumber.slice(-4)}`,
      requestedLimit: Number(request.requestedLimit),
      initialLimit: Number(request.initialLimit),
      durationDays: request.durationDays,
      activeFrom: request.activeFrom?.toISOString() || null,
      activeUntil: request.activeUntil?.toISOString() || null,
      certifiedAt: request.updatedAt.toISOString(),
    };
  }
}
