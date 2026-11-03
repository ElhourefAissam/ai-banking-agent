import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerProfileSummary, Role, UserSummary } from '@proorga/shared-types';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: string): Promise<CustomerProfileSummary> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Customer profile not found for current user');
    }

    return {
      id: profile.id,
      userId: profile.userId,
      cin: profile.cin,
      fileStatus: profile.fileStatus as any,
      incompleteReason: profile.incompleteReason,
      address: profile.address,
      phone: profile.phone,
    };
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

    // Role-based authorization
    if (currentUser.role === Role.CLIENT && profile.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to view this customer profile');
    }

    return profile;
  }
}
