import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuthResponseDto, LoginRequestDto, UserSummary } from '@proorga/shared-types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any,
      portfolioId: user.portfolioId,
      teamId: user.teamId,
    };
  }

  async login(loginDto: LoginRequestDto): Promise<AuthResponseDto> {
    if (!loginDto.email) {
      throw new BadRequestException('Email is required');
    }

    // Default password to Password123! if omitted for demo convenience
    const password = loginDto.password || 'Password123!';
    const user = await this.validateUser(loginDto.email, password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      portfolioId: user.portfolioId,
      teamId: user.teamId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async getProfile(userId: string): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        portfolioId: true,
        teamId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user as UserSummary;
  }
}
