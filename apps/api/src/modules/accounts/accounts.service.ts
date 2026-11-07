import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankAccountSummary,
  EligibilityResult,
  CustomerFileStatus,
  LimitRequestStatus,
  Role,
  UserSummary,
  AccountOperation,
} from '@proorga/shared-types';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async getMyAccounts(userId: string): Promise<BankAccountSummary[]> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { accounts: true },
    });

    if (!profile) {
      return [];
    }

    return profile.accounts.map((acc) => ({
      id: acc.id,
      customerProfileId: acc.customerProfileId,
      accountNumber: acc.accountNumber,
      iban: acc.iban,
      balance: Number(acc.balance),
      initialTransferLimit: Number(acc.initialTransferLimit),
      currentTransferLimit: Number(acc.currentTransferLimit),
      currency: acc.currency,
      activeLimitExpiry: acc.activeLimitExpiry ? acc.activeLimitExpiry.toISOString() : null,
    }));
  }

  async getAccountById(accountId: string, currentUser: UserSummary): Promise<BankAccountSummary> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { customerProfile: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    // Role-based authorization
    if (currentUser.role === Role.CLIENT && account.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to view this account');
    }

    return {
      id: account.id,
      customerProfileId: account.customerProfileId,
      accountNumber: account.accountNumber,
      iban: account.iban,
      balance: Number(account.balance),
      initialTransferLimit: Number(account.initialTransferLimit),
      currentTransferLimit: Number(account.currentTransferLimit),
      currency: account.currency,
      activeLimitExpiry: account.activeLimitExpiry ? account.activeLimitExpiry.toISOString() : null,
    };
  }

  async checkEligibility(accountId: string, currentUser: UserSummary): Promise<EligibilityResult> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        customerProfile: true,
        limitRequests: {
          where: {
            status: {
              in: [
                LimitRequestStatus.SUBMITTED,
                LimitRequestStatus.UNDER_REVIEW,
                LimitRequestStatus.COMPLEMENT_REQUESTED,
                LimitRequestStatus.PENDING_SUPERVISOR,
                LimitRequestStatus.APPROVED_PENDING_ACTIVATION,
                LimitRequestStatus.ACTIVE,
              ],
            },
          },
          take: 1,
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (currentUser.role === Role.CLIENT && account.customerProfile.userId !== currentUser.id) {
      throw new ForbiddenException('You do not own this account');
    }

    const reasons: string[] = [];
    let isEligible = true;

    if (account.customerProfile.fileStatus !== CustomerFileStatus.COMPLETE) {
      isEligible = false;
      reasons.push(
        `Customer profile is incomplete: ${account.customerProfile.incompleteReason || 'Required documents or KYC missing'}`
      );
    }

    const hasActiveRequest = account.limitRequests.length > 0;
    if (hasActiveRequest) {
      isEligible = false;
      const activeReq = account.limitRequests[0];
      reasons.push(
        `An active or pending request (${activeReq.reference}, status: ${activeReq.status}) already exists for this account.`
      );
    }

    return {
      isEligible,
      reasons,
      currentLimit: Number(account.currentTransferLimit),
      customerFileStatus: account.customerProfile.fileStatus as CustomerFileStatus,
      hasActiveRequest,
      activeRequestId: hasActiveRequest ? account.limitRequests[0].id : undefined,
    };
  }

  async getAccountOperations(
    accountId: string,
    currentUser: UserSummary
  ): Promise<AccountOperation[]> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        customerProfile: true,
        limitRequests: {
          include: {
            decisions: {
              include: {
                actor: true,
              },
            },
            activations: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new NotFoundException(`Compte ${accountId} introuvable`);
    }

    if (
      currentUser.role === Role.CLIENT &&
      account.customerProfile.userId !== currentUser.id
    ) {
      throw new ForbiddenException(
        "Vous n'êtes pas autorisé à consulter l'historique de ce compte"
      );
    }

    const operations: AccountOperation[] = [];

    // 1. Process all Limit Requests, Decisions, and Activations
    for (const req of account.limitRequests) {
      // 1.1 Initial Submission / Request
      operations.push({
        id: `op-req-created-${req.id}`,
        accountId: account.id,
        accountNumber: account.accountNumber,
        category: 'LIMIT',
        type: 'LIMIT_INCREASE_REQUESTED',
        label: 'Demande de relèvement de plafond',
        description: `Demande de relèvement temporaire à ${Number(
          req.requestedLimit
        ).toLocaleString('fr-FR')} DH pour ${req.durationDays} jour(s) — « ${req.reason} »`,
        amount: Number(req.requestedLimit),
        currency: account.currency,
        limitBefore: Number(req.initialLimit),
        limitAfter: Number(req.requestedLimit),
        reference: req.reference,
        date: req.createdAt.toISOString(),
        status:
          req.status === LimitRequestStatus.ACTIVE
            ? 'ACTIVE'
            : req.status === LimitRequestStatus.EXPIRED
            ? 'EXPIRED'
            : req.status === LimitRequestStatus.REJECTED
            ? 'REJECTED'
            : req.status === LimitRequestStatus.CANCELLED
            ? 'CANCELLED'
            : 'EXECUTED',
      });

      // 1.2 Decisions recorded on this request
      for (const dec of req.decisions) {
        if (dec.decisionType === 'APPROVE') {
          operations.push({
            id: `op-dec-app-${dec.id}`,
            accountId: account.id,
            accountNumber: account.accountNumber,
            category: 'LIMIT',
            type: 'LIMIT_APPROVED',
            label: `Approbation formelle (${dec.actorRole})`,
            description: `Accord accordé par ${dec.actor?.firstName || ''} ${
              dec.actor?.lastName || 'Responsable Bancaire'
            } : « ${dec.motive} »`,
            amount: Number(req.requestedLimit),
            currency: account.currency,
            limitBefore: Number(req.initialLimit),
            limitAfter: Number(req.requestedLimit),
            reference: req.reference,
            date: dec.createdAt.toISOString(),
            status: 'EXECUTED',
          });
        } else if (dec.decisionType === 'RECOMMEND_APPROVAL') {
          operations.push({
            id: `op-dec-rec-${dec.id}`,
            accountId: account.id,
            accountNumber: account.accountNumber,
            category: 'LIMIT',
            type: 'LIMIT_RECOMMENDED',
            label: 'Recommandation favorable transmise',
            description: `Avis favorable du conseiller pour arbitrage superviseur (> 30 000 DH) : « ${dec.motive} »`,
            amount: Number(req.requestedLimit),
            currency: account.currency,
            reference: req.reference,
            date: dec.createdAt.toISOString(),
            status: 'EXECUTED',
          });
        } else if (dec.decisionType === 'REQUEST_COMPLEMENT') {
          operations.push({
            id: `op-dec-comp-${dec.id}`,
            accountId: account.id,
            accountNumber: account.accountNumber,
            category: 'LIMIT',
            type: 'LIMIT_COMPLEMENT_REQUESTED',
            label: 'Demande de complément d’information',
            description: `Demande de justificatif complémentaire par le conseiller : « ${dec.motive} »`,
            currency: account.currency,
            reference: req.reference,
            date: dec.createdAt.toISOString(),
            status: 'EXECUTED',
          });
        } else if (dec.decisionType === 'REJECT') {
          operations.push({
            id: `op-dec-rej-${dec.id}`,
            accountId: account.id,
            accountNumber: account.accountNumber,
            category: 'LIMIT',
            type: 'LIMIT_REJECTED',
            label: 'Refus motivé du relèvement',
            description: `Demande refusée par la banque : « ${dec.motive} »`,
            amount: Number(req.requestedLimit),
            currency: account.currency,
            reference: req.reference,
            date: dec.createdAt.toISOString(),
            status: 'REJECTED',
          });
        }
      }

      // 1.3 Activations
      for (const act of req.activations) {
        if (act.status === 'SUCCESS' && act.activatedAt) {
          operations.push({
            id: `op-act-success-${act.id}`,
            accountId: account.id,
            accountNumber: account.accountNumber,
            category: 'LIMIT',
            type: 'LIMIT_ACTIVATED',
            label: 'Activation du plafond temporaire',
            description: `Confirmation du switch bancaire : plafond porté à ${Number(
              act.limitApplied
            ).toLocaleString('fr-FR')} DH`,
            amount: Number(act.limitApplied),
            currency: account.currency,
            limitBefore: Number(req.initialLimit),
            limitAfter: Number(act.limitApplied),
            reference: req.reference,
            date: act.activatedAt.toISOString(),
            status: 'ACTIVE',
          });
        }

        if (act.restoredAt) {
          operations.push({
            id: `op-act-restored-${act.id}`,
            accountId: account.id,
            accountNumber: account.accountNumber,
            category: 'LIMIT',
            type: 'LIMIT_EXPIRED_RESTORED',
            label: 'Rétablissement automatique du plafond',
            description: `Échéance de la période temporaire atteinte (${req.durationDays} jours) : retour automatique au plafond de 10 000 DH`,
            amount: Number(act.limitApplied),
            currency: account.currency,
            limitBefore: Number(act.limitApplied),
            limitAfter: Number(req.initialLimit),
            reference: req.reference,
            date: act.restoredAt.toISOString(),
            status: 'EXPIRED',
          });
        }
      }

      // 1.4 Cancellation if applicable
      if (req.status === LimitRequestStatus.CANCELLED) {
        operations.push({
          id: `op-req-cancelled-${req.id}`,
          accountId: account.id,
          accountNumber: account.accountNumber,
          category: 'LIMIT',
          type: 'LIMIT_CANCELLED',
          label: 'Annulation de la demande',
          description: `Demande de relèvement ${req.reference} annulée à l'initiative du client avant décision`,
          currency: account.currency,
          reference: req.reference,
          date: req.updatedAt.toISOString(),
          status: 'CANCELLED',
        });
      }
    }

    // 2. Retail Banking Financial Transactions (Realistic Account Movements)
    const baseDate = new Date(account.createdAt);
    const now = new Date();

    const currentBalance = Number(account.balance);
    const hasActiveOrApprovedHighLimit = account.limitRequests.some(
      (r) =>
        (r.status === LimitRequestStatus.ACTIVE ||
          r.status === LimitRequestStatus.APPROVED_PENDING_ACTIVATION ||
          r.status === LimitRequestStatus.EXPIRED) &&
        Number(r.requestedLimit) > 30000
    );

    // High value transfer executed during temporary limit window
    if (hasActiveOrApprovedHighLimit) {
      const activeReq = account.limitRequests.find(
        (r) => Number(r.requestedLimit) > 30000
      );
      const transferDate = activeReq?.activeFrom
        ? new Date(new Date(activeReq.activeFrom).getTime() + 1000 * 60 * 60 * 4)
        : new Date(now.getTime() - 1000 * 60 * 60 * 24);

      operations.push({
        id: `op-fin-high-val-${account.id}`,
        accountId: account.id,
        accountNumber: account.accountNumber,
        category: 'FINANCIAL',
        type: 'TRANSFER_DEBIT',
        label: 'Virement émis — Règlement Bon de commande',
        description: `Virement exceptionnel émis rendu possible par le plafond temporaire accordé (${activeReq?.reference || 'Plafond Spécial'})`,
        amount: 35000,
        currency: account.currency,
        isDebit: true,
        reference: `VIR-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        date: transferDate.toISOString(),
        status: 'EXECUTED',
      });
    }

    // Standard realistic recurring movements
    const movements = [
      {
        id: `op-fin-sal-${account.id}`,
        type: 'TRANSFER_CREDIT' as const,
        label: 'Virement reçu — Virement Salaire & Primes',
        description: 'Virement mensuel entreprise employeur — Salaire net',
        amount: 28500,
        isDebit: false,
        daysAgo: 5,
        ref: 'VIR-SAL-0921',
      },
      {
        id: `op-fin-rent-${account.id}`,
        type: 'TRANSFER_DEBIT' as const,
        label: 'Virement émis — Loyer & Charges Résidence',
        description: 'Virement bancaire périodique vers le bailleur',
        amount: 5800,
        isDebit: true,
        daysAgo: 8,
        ref: 'VIR-LOY-4401',
      },
      {
        id: `op-fin-ins-${account.id}`,
        type: 'DIRECT_DEBIT' as const,
        label: 'Prélèvement automatique — Assurance & Mutuelle',
        description: 'Prélèvement mensuel contrat multirisque & santé',
        amount: 620,
        isDebit: true,
        daysAgo: 12,
        ref: 'PRL-ASSUR-810',
      },
      {
        id: `op-fin-refund-${account.id}`,
        type: 'TRANSFER_CREDIT' as const,
        label: 'Virement reçu — Remboursement Frais Professionnels',
        description: 'Remboursement note de frais déplacement professionnel',
        amount: 1450,
        isDebit: false,
        daysAgo: 15,
        ref: 'VIR-EXP-3310',
      },
      {
        id: `op-fin-telecom-${account.id}`,
        type: 'DIRECT_DEBIT' as const,
        label: 'Prélèvement automatique — Forfait Télécom & Fibre',
        description: 'Facture mensuelle télécom',
        amount: 490,
        isDebit: true,
        daysAgo: 20,
        ref: 'PRL-TEL-9902',
      },
    ];

    for (const mov of movements) {
      const opDate = new Date(now.getTime() - mov.daysAgo * 24 * 60 * 60 * 1000);
      operations.push({
        id: mov.id,
        accountId: account.id,
        accountNumber: account.accountNumber,
        category: 'FINANCIAL',
        type: mov.type,
        label: mov.label,
        description: mov.description,
        amount: mov.amount,
        currency: account.currency,
        isDebit: mov.isDebit,
        reference: mov.ref,
        date: opDate.toISOString(),
        status: 'EXECUTED',
      });
    }

    // Sort all operations chronologically descending (newest first)
    operations.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return operations;
  }
}
