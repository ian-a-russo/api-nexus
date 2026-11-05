import { makeUser } from '../../test/support/factories';
import {
  ConversationNotFoundException,
  NotConversationParticipantException,
} from '../shared/exceptions/domain.exceptions';
import {
  ConversationsRepository,
  ConversationWithParticipants,
} from './conversations.repository';
import { ConversationsService } from './conversations.service';

function makeConversation(
  overrides: Partial<ConversationWithParticipants> = {},
): ConversationWithParticipants {
  return {
    id: 'conv-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    participants: [
      { user: makeUser({ id: 'user-1', username: 'alice' }) },
      { user: makeUser({ id: 'user-2', username: 'bob', displayName: 'Bob' }) },
    ],
    messages: [],
    ...overrides,
  };
}

describe('ConversationsService', () => {
  let repository: jest.Mocked<
    Pick<
      ConversationsRepository,
      'findAllForUser' | 'findBetween' | 'findById' | 'create' | 'isParticipant'
    >
  >;
  let service: ConversationsService;

  beforeEach(() => {
    repository = {
      findAllForUser: jest.fn(),
      findBetween: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      isParticipant: jest.fn(),
    };
    service = new ConversationsService(
      repository as unknown as ConversationsRepository,
    );
  });

  describe('getForUser', () => {
    it('mostra o outro participante e ordena pela atividade mais recente', async () => {
      const older = makeConversation({ id: 'older' });
      const newer = makeConversation({
        id: 'newer',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        messages: [
          {
            text: 'oi',
            senderId: 'user-2',
            createdAt: new Date('2025-06-01T00:00:00Z'),
            attachmentType: null,
          },
        ],
      });
      repository.findAllForUser.mockResolvedValue([older, newer]);

      const result = await service.getForUser('user-1');

      expect(result.map((summary) => summary.id)).toEqual(['newer', 'older']);
      expect(result[0].participant.username).toBe('bob');
      expect(result[0].lastMessage?.text).toBe('oi');
      expect(result[1].lastMessage).toBeNull();
    });

    it('usa um placeholder quando o outro participante foi removido', async () => {
      repository.findAllForUser.mockResolvedValue([
        makeConversation({
          participants: [{ user: makeUser({ id: 'user-1' }) }],
        }),
      ]);

      const [summary] = await service.getForUser('user-1');

      expect(summary.participant.displayName).toBe('Usuário removido');
    });
  });

  describe('ensureParticipant', () => {
    it('passa quando o usuário participa', async () => {
      repository.isParticipant.mockResolvedValue(true);

      await expect(
        service.ensureParticipant('conv-1', 'user-1'),
      ).resolves.toBeUndefined();
    });

    it('rejeita quem não participa', async () => {
      repository.isParticipant.mockResolvedValue(false);

      await expect(
        service.ensureParticipant('conv-1', 'intruder'),
      ).rejects.toThrow(NotConversationParticipantException);
    });
  });

  describe('findOrCreateBetween', () => {
    it('reaproveita a conversa existente', async () => {
      const existing = makeConversation();
      repository.findBetween.mockResolvedValue(existing);

      await expect(
        service.findOrCreateBetween('user-1', 'user-2'),
      ).resolves.toBe(existing);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('cria quando ainda não existe', async () => {
      const created = makeConversation();
      repository.findBetween.mockResolvedValue(null);
      repository.create.mockResolvedValue(created);

      await expect(
        service.findOrCreateBetween('user-1', 'user-2'),
      ).resolves.toBe(created);
      expect(repository.create).toHaveBeenCalledWith(['user-1', 'user-2']);
    });
  });

  describe('getSummaryFor', () => {
    it('falha quando a conversa não existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getSummaryFor('x', 'user-1')).rejects.toThrow(
        ConversationNotFoundException,
      );
    });
  });
});
