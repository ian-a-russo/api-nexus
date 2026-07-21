import { Injectable } from '@nestjs/common';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import {
  ConversationNotFoundException,
  NotConversationParticipantException,
} from '../shared/exceptions/domain.exceptions';
import {
  ConversationsRepository,
  ConversationWithParticipants,
} from './conversations.repository';
import { ConversationSummaryDto, LastMessagePreviewDto } from './dto/conversation-summary.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly conversationsRepository: ConversationsRepository) {}

  async getForUser(userId: string): Promise<ConversationSummaryDto[]> {
    const conversations = await this.conversationsRepository.findAllForUser(userId);
    return conversations
      .map((conversation) => this.toSummary(conversation, userId))
      .sort((a, b) => this.mostRecentActivity(b) - this.mostRecentActivity(a));
  }

  async ensureParticipant(conversationId: string, userId: string): Promise<void> {
    const isParticipant = await this.conversationsRepository.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new NotConversationParticipantException();
    }
  }

  async findOrCreateBetween(
    userAId: string,
    userBId: string,
  ): Promise<ConversationWithParticipants> {
    const existing = await this.conversationsRepository.findBetween(userAId, userBId);
    if (existing) {
      return existing;
    }
    return this.conversationsRepository.create([userAId, userBId]);
  }

  async hasConversationBetween(userAId: string, userBId: string): Promise<boolean> {
    const existing = await this.conversationsRepository.findBetween(userAId, userBId);
    return existing !== null;
  }

  async getSummaryFor(conversationId: string, userId: string): Promise<ConversationSummaryDto> {
    const conversation = await this.conversationsRepository.findById(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundException();
    }
    return this.toSummary(conversation, userId);
  }

  toSummary(conversation: ConversationWithParticipants, currentUserId: string): ConversationSummaryDto {
    const otherParticipant = conversation.participants.find((p) => p.user.id !== currentUserId)?.user;
    const participant = otherParticipant
      ? new UserSummaryDto(
          otherParticipant.id,
          otherParticipant.username,
          otherParticipant.displayName,
          otherParticipant.avatarUrl,
        )
      : new UserSummaryDto('', '', 'Usuário removido');

    const lastMessage = conversation.messages[0]
      ? new LastMessagePreviewDto(
          conversation.messages[0].text,
          conversation.messages[0].senderId,
          conversation.messages[0].createdAt,
          conversation.messages[0].attachmentType,
        )
      : null;

    return new ConversationSummaryDto(conversation.id, participant, lastMessage, conversation.createdAt);
  }

  private mostRecentActivity(summary: ConversationSummaryDto): number {
    const timestamp = summary.lastMessage?.createdAt ?? summary.createdAt;
    return timestamp.getTime();
  }
}
