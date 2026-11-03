import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN)
  async getAuditTrail(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.auditService.getAllAuditEvents(limitNum, action);
  }
}
