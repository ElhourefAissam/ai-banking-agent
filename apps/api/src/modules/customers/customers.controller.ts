import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSummary } from '@proorga/shared-types';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: UserSummary) {
    return this.customersService.getMyProfile(user.id);
  }

  @Get(':id')
  async getCustomerById(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.customersService.getCustomerProfileById(id, user);
  }
}
