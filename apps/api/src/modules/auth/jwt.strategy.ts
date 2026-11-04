import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserSummary } from '@proorga/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
        (req: any) => {
          let token = null;
          if (req && req.cookies) {
            token = req.cookies['proorga_token'];
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'proorga_banking_ultra_secure_jwt_secret_key_minimum_32_characters_for_production',
    });
  }

  async validate(payload: { sub: string; email: string; role: any }): Promise<UserSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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
      throw new UnauthorizedException('User account no longer exists or token invalid');
    }

    return user as UserSummary;
  }
}
