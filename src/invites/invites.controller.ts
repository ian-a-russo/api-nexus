import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ConversationSummaryDto } from '../conversations/dto/conversation-summary.dto';
import { SendInviteDto } from './dto/send-invite.dto';
import { InviteDto } from './dto/invite.dto';
import { InvitesService } from './invites.service';

@UseGuards(JwtAuthGuard)
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  send(@Body() dto: SendInviteDto, @CurrentUser() currentUser: AuthenticatedUser): Promise<InviteDto> {
    return this.invitesService.send(currentUser.id, dto.username);
  }

  @Get()
  listPending(@CurrentUser() currentUser: AuthenticatedUser): Promise<InviteDto[]> {
    return this.invitesService.listPendingReceived(currentUser.id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ConversationSummaryDto> {
    return this.invitesService.accept(id, currentUser.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string, @CurrentUser() currentUser: AuthenticatedUser): Promise<void> {
    return this.invitesService.reject(id, currentUser.id);
  }
}
