import { EventEmitter2 } from '@nestjs/event-emitter';
import { AttachmentType } from '@prisma/client';
import { makeUser } from '../../test/support/factories';
import { ConversationsService } from '../conversations/conversations.service';
import { DomainEvent } from '../shared/events/domain-events';
import {
  EmptyMessageException,
  NotConversationParticipantException,
} from '../shared/exceptions/domain.exceptions';
import { MessagesRepository, MessageWithSender } from './messages.repository';
import { MessagesService } from './messages.service';

function makeMessage(
  overrides: Partial<MessageWithSender> = {},
): MessageWithSender {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    text: 'oi',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    attachmentUrl: null,
    attachmentType: null,
    attachmentMimeType: null,
    attachmentSize: null,
    sender: makeUser(),
    ...overrides,
  };
}

describe('MessagesService', () => {
  let messagesRepository: jest.Mocked<
    Pick<MessagesRepository, 'create' | 'findByConversation'>
  >;
  let conversationsService: jest.Mocked<
    Pick<ConversationsService, 'ensureParticipant'>
  >;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
  let service: MessagesService;

  beforeEach(() => {
    messagesRepository = { create: jest.fn(), findByConversation: jest.fn() };
    conversationsService = { ensureParticipant: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    service = new MessagesService(
      messagesRepository as unknown as MessagesRepository,
      conversationsService as unknown as ConversationsService,
      eventEmitter as unknown as EventEmitter2,
    );
  });

  describe('send', () => {
    it('persiste o texto sem espaços nas pontas e emite o evento', async () => {
      messagesRepository.create.mockResolvedValue(makeMessage());

      const dto = await service.send('user-1', 'conv-1', '  oi  ');

      expect(messagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'oi', senderId: 'user-1' }),
      );
      expect(dto.sender.username).toBe('alice');
      expect(dto.attachment).toBeNull();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DomainEvent.MessageCreated,
        expect.objectContaining({ conversationId: 'conv-1' }),
      );
    });

    it('aceita mensagem só com anexo, guardando o texto como null', async () => {
      const attachment = {
        url: 'http://cdn/a.png',
        type: AttachmentType.IMAGE,
        mimeType: 'image/png',
        size: 10,
      };
      messagesRepository.create.mockResolvedValue(
        makeMessage({
          text: null,
          attachmentUrl: attachment.url,
          attachmentType: attachment.type,
          attachmentMimeType: attachment.mimeType,
          attachmentSize: attachment.size,
        }),
      );

      const dto = await service.send('user-1', 'conv-1', '   ', attachment);

      expect(messagesRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ text: null, attachmentUrl: attachment.url }),
      );
      expect(dto.attachment).toEqual(attachment);
    });

    it('rejeita mensagem sem texto e sem anexo', async () => {
      await expect(service.send('user-1', 'conv-1', '   ')).rejects.toThrow(
        EmptyMessageException,
      );
      expect(messagesRepository.create).not.toHaveBeenCalled();
    });

    it('rejeita quem não participa da conversa', async () => {
      conversationsService.ensureParticipant.mockRejectedValue(
        new NotConversationParticipantException(),
      );

      await expect(service.send('intruder', 'conv-1', 'oi')).rejects.toThrow(
        NotConversationParticipantException,
      );
      expect(messagesRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('listForConversation', () => {
    it('valida a participação e devolve as mensagens mapeadas', async () => {
      messagesRepository.findByConversation.mockResolvedValue([makeMessage()]);

      const result = await service.listForConversation(
        'user-1',
        'conv-1',
        20,
        'msg-0',
      );

      expect(conversationsService.ensureParticipant).toHaveBeenCalledWith(
        'conv-1',
        'user-1',
      );
      expect(messagesRepository.findByConversation).toHaveBeenCalledWith(
        'conv-1',
        20,
        'msg-0',
      );
      expect(result.map((message) => message.id)).toEqual(['msg-1']);
    });
  });
});
