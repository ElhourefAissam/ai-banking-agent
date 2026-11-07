import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSummary } from '@proorga/shared-types';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get('my-accounts')
  async getMyAccounts(@CurrentUser() user: UserSummary) {
    return this.accountsService.getMyAccounts(user.id);
  }

  @Get(':id')
  async getAccountById(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.accountsService.getAccountById(id, user);
  }

  @Get(':id/eligibility')
  async checkEligibility(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.accountsService.checkEligibility(id, user);
  }

  @Get(':id/operations')
  async getAccountOperations(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.accountsService.getAccountOperations(id, user);
  }
}
