import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BankAccountSummary,
  EligibilityResult,
  CustomerFileStatus,
  LimitRequestStatus,
  Role,
  UserSummary,
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
}
