import { InvalidPasswordException } from '../exceptions/domain.exceptions';

const MIN_LENGTH = 6;

export class Password {
  private readonly value: string;

  constructor(raw: string) {
    Password.ensureValid(raw);
    this.value = raw;
  }

  private static ensureValid(value: string): void {
    if (!value || value.length < MIN_LENGTH) {
      throw new InvalidPasswordException();
    }
  }

  toString(): string {
    return this.value;
  }
}
