import { MessageDto } from '../../messages/dto/message.dto';
import { UserSummaryDto } from '../dto/user-summary.dto';

export const DomainEvent = {
  InviteCreated: 'invite.created',
  InviteAccepted: 'invite.accepted',
  InviteRejected: 'invite.rejected',
  MessageCreated: 'message.created',
} as const;

export class InviteCreatedEvent {
  constructor(
    public readonly inviteId: string,
    public readonly sender: UserSummaryDto,
    public readonly receiver: UserSummaryDto,
  ) {}
}

export class InviteAcceptedEvent {
  constructor(
    public readonly inviteId: string,
    public readonly conversationId: string,
    public readonly participantIds: [string, string],
  ) {}
}

export class InviteRejectedEvent {
  constructor(
    public readonly inviteId: string,
    public readonly senderId: string,
  ) {}
}

export class MessageCreatedEvent {
  constructor(
    public readonly conversationId: string,
    public readonly message: MessageDto,
  ) {}
}
