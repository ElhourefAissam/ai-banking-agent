import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CustomerFileStatus,
  Role,
  UpdateProfileInput,
  UserProfileDetail,
  UserSummary,
} from '@proorga/shared-types';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string): Promise<UserProfileDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: {
          include: {
            accounts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
      cin: user.customerProfile?.cin,
      phone: user.customerProfile?.phone,
      address: user.customerProfile?.address,
      fileStatus: user.customerProfile?.fileStatus as CustomerFileStatus,
      incompleteReason: user.customerProfile?.incompleteReason,
      accounts:
        user.customerProfile?.accounts?.map((acc) => ({
          id: acc.id,
          customerProfileId: acc.customerProfileId,
          accountNumber: acc.accountNumber,
          iban: acc.iban,
          balance: Number(acc.balance),
          initialTransferLimit: Number(acc.initialTransferLimit),
          currentTransferLimit: Number(acc.currentTransferLimit),
          currency: acc.currency,
          activeLimitExpiry: acc.activeLimitExpiry?.toISOString() || null,
        })) || [],
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileInput): Promise<UserProfileDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Update User basic information
    const userUpdates: any = {};
    if (dto.firstName && dto.firstName.trim().length >= 2) {
      userUpdates.firstName = dto.firstName.trim();
    }
    if (dto.lastName && dto.lastName.trim().length >= 2) {
      userUpdates.lastName = dto.lastName.trim();
    }
    if (dto.email && dto.email.trim().includes('@')) {
      const cleanEmail = dto.email.trim().toLowerCase();
      if (cleanEmail !== user.email.toLowerCase()) {
        const existing = await this.prisma.user.findUnique({
          where: { email: cleanEmail },
        });
        if (existing) {
          throw new ConflictException('Cet email est déjà utilisé par un autre compte.');
        }
        userUpdates.email = cleanEmail;
      }
    }

    if (Object.keys(userUpdates).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: userUpdates,
      });
    }

    // 2. Update Customer Profile contact details
    if (user.customerProfile) {
      const profileUpdates: any = {};
      if (dto.phone !== undefined) {
        profileUpdates.phone = dto.phone.trim();
      }
      if (dto.address !== undefined) {
        profileUpdates.address = dto.address.trim();
      }

      if (Object.keys(profileUpdates).length > 0) {
        await this.prisma.customerProfile.update({
          where: { id: user.customerProfile.id },
          data: profileUpdates,
        });
      }
    }

    // 3. Record audit event
    await this.prisma.auditEvent.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'USER_PROFILE_UPDATED',
        entityType: 'User',
        entityId: user.id,
        details: {
          updatedFields: Object.keys({
            ...userUpdates,
            ...(dto.phone ? { phone: dto.phone } : {}),
            ...(dto.address ? { address: dto.address } : {}),
          }),
        },
      },
    });

    return this.getMyProfile(userId);
  }

  async getCustomerProfileById(profileId: string, currentUser: UserSummary) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        accounts: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    // Role-based authorization: Client can only view their own profile
    if (currentUser.role === Role.CLIENT && profile.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to view this customer profile');
    }

    return profile;
  }

  async updateCustomerProfile(
    profileId: string,
    dto: {
      fileStatus?: CustomerFileStatus;
      incompleteReason?: string;
      phone?: string;
      address?: string;
    },
    actor: UserSummary
  ) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { id: profileId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    const updates: any = {};
    if (dto.fileStatus) updates.fileStatus = dto.fileStatus;
    if (dto.incompleteReason !== undefined) updates.incompleteReason = dto.incompleteReason;
    if (dto.phone !== undefined) updates.phone = dto.phone.trim();
    if (dto.address !== undefined) updates.address = dto.address.trim();

    const updated = await this.prisma.customerProfile.update({
      where: { id: profileId },
      data: updates,
      include: { user: true, accounts: true },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'CUSTOMER_PROFILE_STATUS_UPDATED',
        entityType: 'CustomerProfile',
        entityId: profileId,
        details: {
          actorRole: actor.role,
          updates,
        },
      },
    });

    return updated;
  }
}
