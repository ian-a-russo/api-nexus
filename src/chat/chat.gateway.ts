import { UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ConversationsService } from '../conversations/conversations.service';
import { AttachmentInput, MessagesService } from '../messages/messages.service';
import {
  DomainEvent,
  InviteAcceptedEvent,
  InviteCreatedEvent,
  InviteRejectedEvent,
  MessageCreatedEvent,
} from '../shared/events/domain-events';
import { conversationRoom, userRoom } from '../shared/realtime/rooms';
import { ConnectionRegistry } from './connection-registry';

interface SendMessagePayload {
  conversationId: string;
  text?: string;
  attachment?: AttachmentInput;
}

interface TypingPayload {
  conversationId: string;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server: Server;

  private readonly connections = new ConnectionRegistry();

  constructor(
    private readonly wsJwtGuard: WsJwtGuard,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const user = this.tryAuthenticate(client);
    if (!user) {
      client.disconnect(true);
      return;
    }

    client.data.user = user;
    this.connections.add(user.id, client.id);
    await client.join(userRoom(user.id));

    const conversations = await this.conversationsService.getForUser(user.id);
    await Promise.all(conversations.map((conversation) => client.join(conversationRoom(conversation.id))));
    conversations.forEach((conversation) => {
      client.to(conversationRoom(conversation.id)).emit('presence:online', { userId: user.id });
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user) {
      return;
    }

    this.connections.remove(user.id, client.id);
    if (this.connections.isOnline(user.id)) {
      return;
    }

    const conversations = await this.conversationsService.getForUser(user.id);
    conversations.forEach((conversation) => {
      this.server.to(conversationRoom(conversation.id)).emit('presence:offline', { userId: user.id });
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('message:send')
  async handleMessageSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    const user = client.data.user as AuthenticatedUser;
    await this.messagesService.send(user.id, payload.conversationId, payload.text, payload.attachment);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() payload: TypingPayload): void {
    this.relayTyping(client, payload, 'typing:start');
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() payload: TypingPayload): void {
    this.relayTyping(client, payload, 'typing:stop');
  }

  @OnEvent(DomainEvent.MessageCreated)
  handleMessageCreated(event: MessageCreatedEvent): void {
    this.server.to(conversationRoom(event.conversationId)).emit('message:new', event.message);
  }

  @OnEvent(DomainEvent.InviteCreated)
  handleInviteCreated(event: InviteCreatedEvent): void {
    this.server.to(userRoom(event.receiver.id)).emit('invite:new', {
      id: event.inviteId,
      sender: event.sender,
      receiver: event.receiver,
    });
  }

  @OnEvent(DomainEvent.InviteAccepted)
  async handleInviteAccepted(event: InviteAcceptedEvent): Promise<void> {
    const [userAId, userBId] = event.participantIds;
    this.joinConversationRoom([userAId, userBId], event.conversationId);

    const [summaryForA, summaryForB] = await Promise.all([
      this.conversationsService.getSummaryFor(event.conversationId, userAId),
      this.conversationsService.getSummaryFor(event.conversationId, userBId),
    ]);

    this.server.to(userRoom(userAId)).emit('invite:accepted', summaryForA);
    this.server.to(userRoom(userBId)).emit('invite:accepted', summaryForB);

    this.announceCurrentPresence([userAId, userBId], event.conversationId);
  }

  @OnEvent(DomainEvent.InviteRejected)
  handleInviteRejected(event: InviteRejectedEvent): void {
    this.server.to(userRoom(event.senderId)).emit('invite:rejected', { inviteId: event.inviteId });
  }

  private relayTyping(client: Socket, payload: TypingPayload, event: 'typing:start' | 'typing:stop'): void {
    const user = client.data.user as AuthenticatedUser;
    client.to(conversationRoom(payload.conversationId)).emit(event, {
      conversationId: payload.conversationId,
      userId: user.id,
    });
  }

  private joinConversationRoom(userIds: string[], conversationId: string): void {
    userIds.forEach((userId) => {
      this.connections.socketIdsFor(userId).forEach((socketId) => {
        this.server.sockets.sockets.get(socketId)?.join(conversationRoom(conversationId));
      });
    });
  }

  private announceCurrentPresence(userIds: string[], conversationId: string): void {
    userIds
      .filter((userId) => this.connections.isOnline(userId))
      .forEach((userId) => {
        this.server.to(conversationRoom(conversationId)).emit('presence:online', { userId });
      });
  }

  private tryAuthenticate(client: Socket): AuthenticatedUser | null {
    try {
      return this.wsJwtGuard.authenticate(client);
    } catch {
      return null;
    }
  }
}
