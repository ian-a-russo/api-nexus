import { Injectable } from '@nestjs/common';
import { AttachmentType, Conversation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const conversationWithParticipants = {
  participants: { include: { user: true } },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

export type ConversationWithParticipants = Conversation & {
  participants: { user: { id: string; username: string; displayName: string; avatarUrl: string | null } }[];
  messages: { text: string | null; createdAt: Date; senderId: string; attachmentType: AttachmentType | null }[];
};

@Injectable()
export class ConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(participantIds: [string, string]): Promise<ConversationWithParticipants> {
    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
    });
    return this.findById(conversation.id) as Promise<ConversationWithParticipants>;
  }

  async findBetween(userAId: string, userBId: string): Promise<ConversationWithParticipants | null> {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: userAId } } },
          { participants: { some: { userId: userBId } } },
        ],
      },
      include: conversationWithParticipants,
    });
    return conversation as ConversationWithParticipants | null;
  }

  async findAllForUser(userId: string): Promise<ConversationWithParticipants[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: conversationWithParticipants,
    });
    return conversations as ConversationWithParticipants[];
  }

  async findById(id: string): Promise<ConversationWithParticipants | null> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: conversationWithParticipants,
    });
    return conversation as ConversationWithParticipants | null;
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });
    return participant !== null;
  }
}
