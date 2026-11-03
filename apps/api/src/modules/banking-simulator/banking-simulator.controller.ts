import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { BankingSimulatorService } from './banking-simulator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SimulationFailureMode } from '@proorga/shared-types';

@Controller('banking-simulator')
export class BankingSimulatorController {
  constructor(private readonly simulatorService: BankingSimulatorService) {}

  @Get('failure-mode')
  getFailureMode() {
    return { failureMode: this.simulatorService.getFailureMode() };
  }

  @Post('override-failure-mode')
  overrideFailureMode(@Body('mode') mode: SimulationFailureMode) {
    this.simulatorService.setFailureMode(mode);
    return { success: true, activeMode: this.simulatorService.getFailureMode() };
  }

  @Post('activate/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN)
  async activateLimit(@Param('requestId') requestId: string) {
    return this.simulatorService.activateLimit(requestId);
  }

  @Post('restore/:requestId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN)
  async restoreLimit(@Param('requestId') requestId: string) {
    return this.simulatorService.restoreLimit(requestId);
  }

  @Post('check-expirations')
  async checkExpirations() {
    return this.simulatorService.checkAndExpireLimits();
  }
}
