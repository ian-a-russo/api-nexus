import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserInput {
  username: string;
  displayName: string;
  passwordHash: string;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data: input });
  }

  searchByUsernamePrefix(
    prefix: string,
    excludeUserId: string,
    limit: number,
  ): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        username: { startsWith: prefix },
        NOT: { id: excludeUserId },
      },
      take: limit,
      orderBy: { username: 'asc' },
    });
  }

  updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }
}
