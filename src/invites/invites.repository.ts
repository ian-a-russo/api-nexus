import { Injectable } from '@nestjs/common';
import { ConversationInvite, InviteStatus, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type InviteWithSender = ConversationInvite & { sender: User };
export type InviteWithParties = ConversationInvite & {
  sender: User;
  receiver: User;
};

@Injectable()
export class InvitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(senderId: string, receiverId: string): Promise<ConversationInvite> {
    return this.prisma.conversationInvite.create({
      data: { senderId, receiverId },
    });
  }

  findPendingBetween(
    userAId: string,
    userBId: string,
  ): Promise<ConversationInvite | null> {
    return this.prisma.conversationInvite.findFirst({
      where: {
        status: InviteStatus.PENDING,
        OR: [
          { senderId: userAId, receiverId: userBId },
          { senderId: userBId, receiverId: userAId },
        ],
      },
    });
  }

  findById(id: string): Promise<InviteWithParties | null> {
    return this.prisma.conversationInvite.findUnique({
      where: { id },
      include: { sender: true, receiver: true },
    });
  }

  findPendingReceivedBy(userId: string): Promise<InviteWithSender[]> {
    return this.prisma.conversationInvite.findMany({
      where: { receiverId: userId, status: InviteStatus.PENDING },
      include: { sender: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, status: InviteStatus): Promise<ConversationInvite> {
    return this.prisma.conversationInvite.update({
      where: { id },
      data: { status, respondedAt: new Date() },
    });
  }
}
