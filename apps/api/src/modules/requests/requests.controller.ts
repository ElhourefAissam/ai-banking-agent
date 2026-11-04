import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  Role,
  LimitRequestStatus,
  UserSummary,
  CreateDraftInput,
  UpdateDraftInput,
  SubmitRequestInput,
  MotivatedDecisionInput,
  RespondComplementInput,
} from '@proorga/shared-types';

@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('my-requests')
  @Roles(Role.CLIENT, Role.ADMIN)
  async getMyRequests(@CurrentUser() user: UserSummary) {
    return this.requestsService.getMyRequests(user);
  }

  @Get('advisor-queue')
  @Roles(Role.CONSEILLER, Role.ADMIN)
  async getAdvisorQueue(
    @CurrentUser() user: UserSummary,
    @Query('status') status?: LimitRequestStatus,
  ) {
    return this.requestsService.getAdvisorQueue(user, status);
  }

  @Get('supervisor-queue')
  @Roles(Role.SUPERVISEUR, Role.ADMIN)
  async getSupervisorQueue(
    @CurrentUser() user: UserSummary,
    @Query('status') status?: LimitRequestStatus,
  ) {
    return this.requestsService.getSupervisorQueue(user, status);
  }

  @Get(':id')
  async getRequestById(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.requestsService.getRequestById(id, user);
  }

  @Post('draft')
  @Roles(Role.CLIENT, Role.ADMIN)
  async createDraft(
    @CurrentUser() user: UserSummary,
    @Body() dto: CreateDraftInput,
  ) {
    return this.requestsService.createDraft(user, dto);
  }

  @Put(':id/draft')
  @Roles(Role.CLIENT, Role.ADMIN)
  async updateDraft(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: UpdateDraftInput,
  ) {
    return this.requestsService.updateDraft(user, id, dto);
  }

  @Post(':id/submit')
  @Roles(Role.CLIENT, Role.ADMIN)
  async submitRequest(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: SubmitRequestInput,
  ) {
    return this.requestsService.submitRequest(user, id, dto);
  }

  @Post(':id/complement')
  @Roles(Role.CONSEILLER, Role.ADMIN)
  async requestComplement(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: MotivatedDecisionInput,
  ) {
    return this.requestsService.requestComplement(user, id, dto);
  }

  @Post(':id/resubmit')
  @Roles(Role.CLIENT, Role.ADMIN)
  async resubmitComplement(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: RespondComplementInput,
  ) {
    return this.requestsService.resubmitComplement(user, id, dto);
  }

  @Post(':id/recommend')
  @Roles(Role.CONSEILLER, Role.ADMIN)
  async recommendApproval(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: MotivatedDecisionInput,
  ) {
    return this.requestsService.recommendApproval(user, id, dto);
  }

  @Post(':id/approve')
  @Roles(Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN)
  async approveRequest(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: MotivatedDecisionInput,
  ) {
    return this.requestsService.approveRequest(user, id, dto);
  }

  @Post(':id/reject')
  @Roles(Role.CONSEILLER, Role.SUPERVISEUR, Role.ADMIN)
  async rejectRequest(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: MotivatedDecisionInput,
  ) {
    return this.requestsService.rejectRequest(user, id, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.CLIENT, Role.ADMIN)
  async cancelRequest(
    @CurrentUser() user: UserSummary,
    @Param('id') id: string,
    @Body() dto: SubmitRequestInput,
  ) {
    return this.requestsService.cancelRequest(user, id, dto);
  }
}
