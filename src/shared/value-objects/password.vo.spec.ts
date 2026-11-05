import { InvalidPasswordException } from '../exceptions/domain.exceptions';
import { Password } from './password.vo';

describe('Password', () => {
  it('aceita senha com o tamanho mínimo', () => {
    expect(new Password('123456').toString()).toBe('123456');
  });

  it.each(['', '12345'])('rejeita senha curta "%s"', (raw) => {
    expect(() => new Password(raw)).toThrow(InvalidPasswordException);
  });
});
