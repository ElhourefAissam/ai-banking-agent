import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UserSummary,
  UpdateProfileInput,
  Role,
  CustomerFileStatus,
} from '@proorga/shared-types';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: UserSummary) {
    return this.customersService.getMyProfile(user.id);
  }

  @Put('me')
  async updateMyProfile(
    @CurrentUser() user: UserSummary,
    @Body() dto: UpdateProfileInput,
  ) {
    return this.customersService.updateMyProfile(user.id, dto);
  }

  @Post('me/upload-kyc')
  @UseInterceptors(FileInterceptor('file'))
  async uploadKycDocument(
    @CurrentUser() user: UserSummary,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.customersService.uploadKycDocument(user.id, file);
  }

  @Get(':id')
  async getCustomerById(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.customersService.getCustomerProfileById(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN)
  async updateCustomerProfile(
    @Param('id') id: string,
    @Body()
    dto: {
      fileStatus?: CustomerFileStatus;
      incompleteReason?: string;
      phone?: string;
      address?: string;
    },
    @CurrentUser() user: UserSummary,
  ) {
    return this.customersService.updateCustomerProfile(id, dto, user);
  }
}
