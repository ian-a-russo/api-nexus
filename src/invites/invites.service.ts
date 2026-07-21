import { Injectable } from '@nestjs/common';
import { ConversationInvite, InviteStatus, User } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConversationsService } from '../conversations/conversations.service';
import { ConversationSummaryDto } from '../conversations/dto/conversation-summary.dto';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import {
  DomainEvent,
  InviteAcceptedEvent,
  InviteCreatedEvent,
  InviteRejectedEvent,
} from '../shared/events/domain-events';
import {
  InviteAlreadyPendingException,
  InviteNotFoundException,
  InviteNotRespondableException,
  ConversationAlreadyExistsException,
  SelfInviteException,
  UserNotFoundException,
} from '../shared/exceptions/domain.exceptions';
import { UsersRepository } from '../users/users.repository';
import { UsersService } from '../users/users.service';
import { InviteDto } from './dto/invite.dto';
import { InvitesRepository, InviteWithParties } from './invites.repository';

@Injectable()
export class InvitesService {
  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly conversationsService: ConversationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async send(senderId: string, rawUsername: string): Promise<InviteDto> {
    const receiver = await this.resolveReceiver(rawUsername);
    this.ensureNotSelf(senderId, receiver.id);
    await this.ensureNoExistingConversation(senderId, receiver.id);
    await this.ensureNoPendingInvite(senderId, receiver.id);

    const sender = await this.usersRepository.findById(senderId);
    const invite = await this.invitesRepository.create(senderId, receiver.id);

    const senderSummary = UsersService.toSummary(sender as User);
    const receiverSummary = UsersService.toSummary(receiver);

    this.eventEmitter.emit(
      DomainEvent.InviteCreated,
      new InviteCreatedEvent(invite.id, senderSummary, receiverSummary),
    );

    return new InviteDto(invite.id, senderSummary, receiverSummary, invite.createdAt);
  }

  async listPendingReceived(userId: string): Promise<InviteDto[]> {
    const [invites, receiver] = await Promise.all([
      this.invitesRepository.findPendingReceivedBy(userId),
      this.usersRepository.findById(userId),
    ]);
    const receiverSummary = UsersService.toSummary(receiver as User);

    return invites.map(
      (invite) => new InviteDto(invite.id, UsersService.toSummary(invite.sender), receiverSummary, invite.createdAt),
    );
  }

  async accept(inviteId: string, userId: string): Promise<ConversationSummaryDto> {
    const invite = await this.getRespondableInvite(inviteId, userId);
    const conversation = await this.conversationsService.findOrCreateBetween(
      invite.senderId,
      invite.receiverId,
    );
    await this.invitesRepository.updateStatus(invite.id, InviteStatus.ACCEPTED);

    this.eventEmitter.emit(
      DomainEvent.InviteAccepted,
      new InviteAcceptedEvent(invite.id, conversation.id, [invite.senderId, invite.receiverId]),
    );

    return this.conversationsService.toSummary(conversation, userId);
  }

  async reject(inviteId: string, userId: string): Promise<void> {
    const invite = await this.getRespondableInvite(inviteId, userId);
    await this.invitesRepository.updateStatus(invite.id, InviteStatus.REJECTED);
    this.eventEmitter.emit(
      DomainEvent.InviteRejected,
      new InviteRejectedEvent(invite.id, invite.senderId),
    );
  }

  private async resolveReceiver(rawUsername: string): Promise<User> {
    const normalized = rawUsername.trim().replace(/^@/, '').toLowerCase();
    const receiver = await this.usersRepository.findByUsername(normalized);
    if (!receiver) {
      throw new UserNotFoundException();
    }
    return receiver;
  }

  private ensureNotSelf(senderId: string, receiverId: string): void {
    if (senderId === receiverId) {
      throw new SelfInviteException();
    }
  }

  private async ensureNoExistingConversation(userAId: string, userBId: string): Promise<void> {
    const alreadyExists = await this.conversationsService.hasConversationBetween(userAId, userBId);
    if (alreadyExists) {
      throw new ConversationAlreadyExistsException();
    }
  }

  private async ensureNoPendingInvite(userAId: string, userBId: string): Promise<void> {
    const pending = await this.invitesRepository.findPendingBetween(userAId, userBId);
    if (pending) {
      throw new InviteAlreadyPendingException();
    }
  }

  private async getRespondableInvite(inviteId: string, userId: string): Promise<InviteWithParties> {
    const invite = await this.invitesRepository.findById(inviteId);
    if (!invite) {
      throw new InviteNotFoundException();
    }
    if (invite.receiverId !== userId || invite.status !== InviteStatus.PENDING) {
      throw new InviteNotRespondableException();
    }
    return invite;
  }
}
