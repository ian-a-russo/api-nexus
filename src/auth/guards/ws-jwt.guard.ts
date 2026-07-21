import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthenticatedUser } from '../types/authenticated-user';

interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    client.data.user = this.authenticate(client);
    return true;
  }

  authenticate(client: Socket): AuthenticatedUser {
    const token = this.extractToken(client);
    if (!token) {
      throw new WsException('Unauthorized');
    }
    return this.verifyToken(token);
  }

  private verifyToken(token: string): AuthenticatedUser {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      return { id: payload.sub, username: payload.username };
    } catch {
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) {
      return authToken;
    }
    const header = client.handshake.headers?.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  }
}
