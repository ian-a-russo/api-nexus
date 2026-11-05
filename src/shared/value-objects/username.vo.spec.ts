import { InvalidUsernameException } from '../exceptions/domain.exceptions';
import { Username } from './username.vo';

describe('Username', () => {
  it('normaliza espaços, arroba inicial e caixa', () => {
    const username = new Username('  @Alice_01 ');

    expect(username.toString()).toBe('alice_01');
    expect(username.toHandle()).toBe('@alice_01');
  });

  it.each(['ab', 'a'.repeat(21), 'com espaco', 'acentuação', '', '@'])(
    'rejeita "%s"',
    (raw) => {
      expect(() => new Username(raw)).toThrow(InvalidUsernameException);
    },
  );

  it('expõe a normalização sem validar o tamanho', () => {
    expect(Username.normalize(' @Bo ')).toBe('bo');
  });
});
