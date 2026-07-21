export class UserSummaryDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;

  constructor(id: string, username: string, displayName: string, avatarUrl: string | null = null) {
    this.id = id;
    this.username = username;
    this.displayName = displayName;
    this.avatarUrl = avatarUrl;
  }
}
