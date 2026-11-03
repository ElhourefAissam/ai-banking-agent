import { Controller, Post, Get, Delete, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserSummary } from '@proorga/shared-types';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('messages')
  async getMessages(@CurrentUser() user: UserSummary) {
    return this.aiService.getMessages(user);
  }

  @Post('chat')
  async chat(
    @CurrentUser() user: UserSummary,
    @Body('message') message: string,
    @Body('conversationId') conversationId?: string,
  ) {
    return this.aiService.handleChatMessage(user, message, conversationId);
  }

  @Delete('clear')
  async clearConversation(@CurrentUser() user: UserSummary) {
    return this.aiService.clearConversation(user);
  }

  @Get('provider')
  getProvider() {
    return { provider: this.aiService.getProviderName() };
  }
}
