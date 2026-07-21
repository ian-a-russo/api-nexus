import { Injectable } from '@nestjs/common';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import { UsersRepository } from './users.repository';

const SEARCH_RESULTS_LIMIT = 10;

interface UserLike {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async search(rawQuery: string, currentUserId: string): Promise<UserSummaryDto[]> {
    const prefix = this.normalizeSearchTerm(rawQuery);
    if (!prefix) {
      return [];
    }

    const users = await this.usersRepository.searchByUsernamePrefix(
      prefix,
      currentUserId,
      SEARCH_RESULTS_LIMIT,
    );

    return users.map((user) => UsersService.toSummary(user));
  }

  private normalizeSearchTerm(rawQuery: string): string {
    return rawQuery.trim().replace(/^@/, '').toLowerCase();
  }

  static toSummary(user: UserLike): UserSummaryDto {
    return new UserSummaryDto(user.id, user.username, user.displayName, user.avatarUrl ?? null);
  }
}
