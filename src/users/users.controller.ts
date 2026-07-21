import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  search(
    @Query() query: SearchUsersDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserSummaryDto[]> {
    return this.usersService.search(query.q, currentUser.id);
  }
}
