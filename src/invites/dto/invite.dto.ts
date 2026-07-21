import { UserSummaryDto } from '../../shared/dto/user-summary.dto';

export class InviteDto {
  constructor(
    public readonly id: string,
    public readonly sender: UserSummaryDto,
    public readonly receiver: UserSummaryDto,
    public readonly createdAt: Date,
  ) {}
}
