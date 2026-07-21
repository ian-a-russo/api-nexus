import { InvalidUsernameException } from '../exceptions/domain.exceptions';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export class Username {
  private readonly value: string;

  constructor(raw: string) {
    const normalized = Username.normalize(raw);
    Username.ensureValid(normalized);
    this.value = normalized;
  }

  private static normalize(raw: string): string {
    return raw.trim().replace(/^@/, '').toLowerCase();
  }

  private static ensureValid(value: string): void {
    if (!USERNAME_PATTERN.test(value)) {
      throw new InvalidUsernameException();
    }
  }

  toString(): string {
    return this.value;
  }

  toHandle(): string {
    return `@${this.value}`;
  }
}
