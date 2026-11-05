export interface UserSummarySource {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

export class UserSummaryDto {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly displayName: string,
    public readonly avatarUrl: string | null = null,
  ) {}

  static from(user: UserSummarySource): UserSummaryDto {
    return new UserSummaryDto(
      user.id,
      user.username,
      user.displayName,
      user.avatarUrl ?? null,
    );
  }

  static removed(): UserSummaryDto {
    return new UserSummaryDto('', '', 'Usuário removido');
  }
}
