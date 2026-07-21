import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ListMessagesDto } from './dto/list-messages.dto';
import { MessageDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<MessageDto[]> {
    return this.messagesService.listForConversation(
      currentUser.id,
      conversationId,
      query.limit,
      query.before,
    );
  }
}
