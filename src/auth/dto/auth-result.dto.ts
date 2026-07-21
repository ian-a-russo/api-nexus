import { UserSummaryDto } from '../../shared/dto/user-summary.dto';

export class AuthResultDto {
  constructor(
    public readonly accessToken: string,
    public readonly user: UserSummaryDto,
  ) {}
}
