import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttachmentType } from '@prisma/client';
import { ConversationsService } from '../conversations/conversations.service';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import { DomainEvent, MessageCreatedEvent } from '../shared/events/domain-events';
import { EmptyMessageException } from '../shared/exceptions/domain.exceptions';
import { MessageAttachmentDto, MessageDto } from './dto/message.dto';
import { MessagesRepository, MessageWithSender } from './messages.repository';

export interface AttachmentInput {
  url: string;
  type: AttachmentType;
  mimeType: string;
  size: number;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly conversationsService: ConversationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(
    userId: string,
    conversationId: string,
    rawText: string | undefined,
    attachment?: AttachmentInput,
  ): Promise<MessageDto> {
    await this.conversationsService.ensureParticipant(conversationId, userId);
    const text = this.sanitize(rawText, attachment);

    const message = await this.messagesRepository.create({
      conversationId,
      senderId: userId,
      text,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type,
      attachmentMimeType: attachment?.mimeType,
      attachmentSize: attachment?.size,
    });
    const dto = this.toDto(message);

    this.eventEmitter.emit(DomainEvent.MessageCreated, new MessageCreatedEvent(conversationId, dto));

    return dto;
  }

  async listForConversation(
    userId: string,
    conversationId: string,
    limit?: number,
    beforeMessageId?: string,
  ): Promise<MessageDto[]> {
    await this.conversationsService.ensureParticipant(conversationId, userId);
    const messages = await this.messagesRepository.findByConversation(conversationId, limit, beforeMessageId);
    return messages.map((message) => this.toDto(message));
  }

  private sanitize(rawText: string | undefined, attachment: AttachmentInput | undefined): string | null {
    const text = (rawText ?? '').trim();
    if (!text && !attachment) {
      throw new EmptyMessageException();
    }
    return text || null;
  }

  private toDto(message: MessageWithSender): MessageDto {
    const sender = new UserSummaryDto(
      message.sender.id,
      message.sender.username,
      message.sender.displayName,
      message.sender.avatarUrl,
    );
    const attachment = message.attachmentUrl
      ? new MessageAttachmentDto(
          message.attachmentUrl,
          message.attachmentType as AttachmentType,
          message.attachmentMimeType ?? '',
          message.attachmentSize ?? 0,
        )
      : null;
    return new MessageDto(message.id, message.conversationId, message.text, message.createdAt, sender, attachment);
  }
}
