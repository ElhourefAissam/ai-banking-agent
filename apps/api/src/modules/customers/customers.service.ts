import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
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

    // 1. Guard: strictly forbid modification of sensitive identity/security information
    const sensitiveAttempts: string[] = [];
    if (dto.firstName !== undefined && dto.firstName.trim() !== user.firstName) {
      sensitiveAttempts.push('firstName');
    }
    if (dto.lastName !== undefined && dto.lastName.trim() !== user.lastName) {
      sensitiveAttempts.push('lastName');
    }
    if (dto.email !== undefined && dto.email.trim().toLowerCase() !== user.email.toLowerCase()) {
      sensitiveAttempts.push('email');
    }
    if ((dto as any).cin !== undefined && (dto as any).cin !== user.customerProfile?.cin) {
      sensitiveAttempts.push('cin');
    }
    if ((dto as any).role !== undefined && (dto as any).role !== user.role) {
      sensitiveAttempts.push('role');
    }
    if ((dto as any).fileStatus !== undefined && (dto as any).fileStatus !== user.customerProfile?.fileStatus) {
      sensitiveAttempts.push('fileStatus');
    }

    if (sensitiveAttempts.length > 0) {
      throw new ForbiddenException(
        `Modification d'informations sensibles interdite (${sensitiveAttempts.join(', ')}). Conformément aux règles bancaires et aux normes KYC, l'identité légale et l'email ne peuvent être modifiés en ligne. Veuillez contacter votre agence bancaire.`
      );
    }

    // 2. Only allow updating non-sensitive contact details: phone, address
    const updatedFields: string[] = [];
    if (user.customerProfile) {
      const profileUpdates: { phone?: string; address?: string } = {};

      if (dto.phone !== undefined) {
        profileUpdates.phone = dto.phone.trim();
        updatedFields.push('phone');
      }
      if (dto.address !== undefined) {
        profileUpdates.address = dto.address.trim();
        updatedFields.push('address');
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
        action: 'USER_CONTACT_UPDATED',
        entityType: 'User',
        entityId: user.id,
        details: {
          updatedFields,
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

  async uploadKycDocument(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Fichier manquant');
    }

    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const ext = path.extname(file.originalname) || '.pdf';
    const filename = `kyc_${userId}_${Date.now()}${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    const updated = await this.prisma.customerProfile.update({
      where: { userId },
      data: {
        fileStatus: CustomerFileStatus.COMPLETE,
        incompleteReason: null,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actorId: userId,
        actorEmail: profile.user?.email || '',
        actorRole: Role.CLIENT,
        action: 'KYC_DOCUMENT_REGULARIZED',
        entityType: 'CustomerProfile',
        entityId: profile.id,
        details: {
          fileName: file.originalname,
          fileSize: file.size,
        },
      },
    });

    return {
      success: true,
      fileStatus: CustomerFileStatus.COMPLETE,
      message:
        'Votre justificatif a été enregistré avec succès et votre dossier est désormais complet.',
    };
  }
}
