import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSummary } from '@proorga/shared-types';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Real-Time Server-Sent Events (SSE) Stream for Zero-Polling Notifications.
   */
  @Sse('stream')
  streamNotifications(
    @CurrentUser() user: UserSummary,
  ): Observable<{ data: any }> {
    return this.notificationsService.getUserStream(user.id);
  }

  @Get()
  async getMyNotifications(
    @CurrentUser() user: UserSummary,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 50;
    return this.notificationsService.getNotificationsForUser(user.id, take);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: UserSummary) {
    const unreadCount = await this.notificationsService.getUnreadCount(user.id);
    return { unreadCount };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: UserSummary,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: UserSummary) {
    return this.notificationsService.markAllAsRead(user.id);
  }
}
