import { ConversationInvite, InviteStatus, User } from '@prisma/client';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    username: 'alice',
    displayName: 'Alice',
    passwordHash: 'hash',
    avatarUrl: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

export function makeInvite(
  overrides: Partial<ConversationInvite> = {},
): ConversationInvite {
  return {
    id: 'invite-1',
    senderId: 'user-1',
    receiverId: 'user-2',
    status: InviteStatus.PENDING,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    respondedAt: null,
    ...overrides,
  };
}
