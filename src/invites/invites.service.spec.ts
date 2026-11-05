import { EventEmitter2 } from '@nestjs/event-emitter';
import { InviteStatus } from '@prisma/client';
import { makeInvite, makeUser } from '../../test/support/factories';
import { ConversationsService } from '../conversations/conversations.service';
import { DomainEvent } from '../shared/events/domain-events';
import {
  ConversationAlreadyExistsException,
  InviteAlreadyPendingException,
  InviteNotFoundException,
  InviteNotRespondableException,
  SelfInviteException,
  UserNotFoundException,
} from '../shared/exceptions/domain.exceptions';
import { UsersRepository } from '../users/users.repository';
import { InvitesRepository } from './invites.repository';
import { InvitesService } from './invites.service';

const sender = makeUser({ id: 'user-1', username: 'alice' });
const receiver = makeUser({
  id: 'user-2',
  username: 'bob',
  displayName: 'Bob',
});

describe('InvitesService', () => {
  let invitesRepository: jest.Mocked<
    Pick<
      InvitesRepository,
      | 'create'
      | 'findPendingBetween'
      | 'findById'
      | 'findPendingReceivedBy'
      | 'updateStatus'
    >
  >;
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findByUsername' | 'findById'>
  >;
  let conversationsService: jest.Mocked<
    Pick<
      ConversationsService,
      'hasConversationBetween' | 'findOrCreateBetween' | 'toSummary'
    >
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
  let service: InvitesService;

  beforeEach(() => {
    invitesRepository = {
      create: jest.fn(),
      findPendingBetween: jest.fn(),
      findById: jest.fn(),
      findPendingReceivedBy: jest.fn(),
      updateStatus: jest.fn(),
    };
    usersRepository = { findByUsername: jest.fn(), findById: jest.fn() };
    conversationsService = {
      hasConversationBetween: jest.fn(),
      findOrCreateBetween: jest.fn(),
      toSummary: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };
    service = new InvitesService(
      invitesRepository as unknown as InvitesRepository,
      usersRepository as unknown as UsersRepository,
      conversationsService as unknown as ConversationsService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('send', () => {
    beforeEach(() => {
      usersRepository.findByUsername.mockResolvedValue(receiver);
      usersRepository.findById.mockResolvedValue(sender);
      conversationsService.hasConversationBetween.mockResolvedValue(false);
      invitesRepository.findPendingBetween.mockResolvedValue(null);
      invitesRepository.create.mockResolvedValue(makeInvite());
    });

    it('cria o convite e emite o evento de criação', async () => {
      const result = await service.send('user-1', '@Bob');

      expect(usersRepository.findByUsername).toHaveBeenCalledWith('bob');
      expect(invitesRepository.create).toHaveBeenCalledWith('user-1', 'user-2');
      expect(result.sender.username).toBe('alice');
      expect(result.receiver.username).toBe('bob');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DomainEvent.InviteCreated,
        expect.objectContaining({ inviteId: 'invite-1' }),
      );
    });

    it('rejeita destinatário inexistente', async () => {
      usersRepository.findByUsername.mockResolvedValue(null);

      await expect(service.send('user-1', 'ghost')).rejects.toThrow(
        UserNotFoundException,
      );
    });

    it('rejeita convite para si mesmo', async () => {
      await expect(service.send('user-2', 'bob')).rejects.toThrow(
        SelfInviteException,
      );
      expect(invitesRepository.create).not.toHaveBeenCalled();
    });

    it('rejeita quando a conversa já existe', async () => {
      conversationsService.hasConversationBetween.mockResolvedValue(true);

      await expect(service.send('user-1', 'bob')).rejects.toThrow(
        ConversationAlreadyExistsException,
      );
    });

    it('rejeita quando já há convite pendente entre os dois', async () => {
      invitesRepository.findPendingBetween.mockResolvedValue(makeInvite());

      await expect(service.send('user-1', 'bob')).rejects.toThrow(
        InviteAlreadyPendingException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('falha de forma explícita se o remetente não existir mais', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.send('user-1', 'bob')).rejects.toThrow(
        UserNotFoundException,
      );
    });
  });

  describe('listPendingReceived', () => {
    it('lista os convites pendentes com remetente e destinatário', async () => {
      invitesRepository.findPendingReceivedBy.mockResolvedValue([
        { ...makeInvite(), sender },
      ]);
      usersRepository.findById.mockResolvedValue(receiver);

      const result = await service.listPendingReceived('user-2');

      expect(result).toHaveLength(1);
      expect(result[0].sender.username).toBe('alice');
      expect(result[0].receiver.username).toBe('bob');
    });
  });

  describe('accept', () => {
    const invite = { ...makeInvite(), sender, receiver };

    it('aceita, cria a conversa e emite o evento', async () => {
      invitesRepository.findById.mockResolvedValue(invite);
      conversationsService.findOrCreateBetween.mockResolvedValue({
        id: 'conv-1',
      } as never);

      await service.accept('invite-1', 'user-2');

      expect(invitesRepository.updateStatus).toHaveBeenCalledWith(
        'invite-1',
        InviteStatus.ACCEPTED,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DomainEvent.InviteAccepted,
        expect.objectContaining({
          conversationId: 'conv-1',
          participantIds: ['user-1', 'user-2'],
        }),
      );
    });

    it('rejeita convite inexistente', async () => {
      invitesRepository.findById.mockResolvedValue(null);

      await expect(service.accept('x', 'user-2')).rejects.toThrow(
        InviteNotFoundException,
      );
    });

    it('impede que quem não é o destinatário responda', async () => {
      invitesRepository.findById.mockResolvedValue(invite);

      await expect(service.accept('invite-1', 'user-1')).rejects.toThrow(
        InviteNotRespondableException,
      );
    });

    it('impede responder um convite já respondido', async () => {
      invitesRepository.findById.mockResolvedValue({
        ...invite,
        status: InviteStatus.ACCEPTED,
      });

      await expect(service.accept('invite-1', 'user-2')).rejects.toThrow(
        InviteNotRespondableException,
      );
      expect(invitesRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('reject', () => {
    it('recusa e avisa o remetente', async () => {
      invitesRepository.findById.mockResolvedValue({
        ...makeInvite(),
        sender,
        receiver,
      });

      await service.reject('invite-1', 'user-2');

      expect(invitesRepository.updateStatus).toHaveBeenCalledWith(
        'invite-1',
        InviteStatus.REJECTED,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DomainEvent.InviteRejected,
        expect.objectContaining({ senderId: 'user-1' }),
      );
    });
  });
});
