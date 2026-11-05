import { Socket } from 'socket.io';
import { AuthenticatedUser } from './types/authenticated-user';

interface SocketData {
  user?: AuthenticatedUser;
}

export function bindUser(client: Socket, user: AuthenticatedUser): void {
  (client.data as SocketData).user = user;
}

export function boundUser(client: Socket): AuthenticatedUser | undefined {
  return (client.data as SocketData).user;
}

export function requireBoundUser(client: Socket): AuthenticatedUser {
  const user = boundUser(client);
  if (!user) {
    throw new Error('Socket sem usuário autenticado.');
  }
  return user;
}
