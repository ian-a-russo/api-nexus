import { Injectable } from '@nestjs/common';
import { AttachmentType, Message, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type MessageWithSender = Message & { sender: User };

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  text: string | null;
  attachmentUrl?: string;
  attachmentType?: AttachmentType;
  attachmentMimeType?: string;
  attachmentSize?: number;
}

const DEFAULT_PAGE_SIZE = 50;

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateMessageInput): Promise<MessageWithSender> {
    return this.prisma.message.create({
      data: input,
      include: { sender: true },
    });
  }

  async findByConversation(
    conversationId: string,
    take: number = DEFAULT_PAGE_SIZE,
    beforeMessageId?: string,
  ): Promise<MessageWithSender[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
      take,
      ...(beforeMessageId ? { cursor: { id: beforeMessageId }, skip: 1 } : {}),
    });
    return messages.reverse();
  }
}
