import { Injectable } from '@nestjs/common';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import { Username } from '../shared/value-objects/username.vo';
import { UsersRepository } from './users.repository';

const SEARCH_RESULTS_LIMIT = 10;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async search(
    rawQuery: string,
    currentUserId: string,
  ): Promise<UserSummaryDto[]> {
    const prefix = Username.normalize(rawQuery);
    if (!prefix) {
      return [];
    }

    const users = await this.usersRepository.searchByUsernamePrefix(
      prefix,
      currentUserId,
      SEARCH_RESULTS_LIMIT,
    );

    return users.map((user) => UserSummaryDto.from(user));
  }
}
