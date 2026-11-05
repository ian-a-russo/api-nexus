import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ConversationsService } from './conversations.service';
import { ConversationSummaryDto } from './dto/conversation-summary.dto';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ConversationSummaryDto[]> {
    return this.conversationsService.getForUser(currentUser.id);
  }
}
