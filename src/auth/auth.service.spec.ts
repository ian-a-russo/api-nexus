import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { makeUser } from '../../test/support/factories';
import {
  InvalidCredentialsException,
  InvalidPasswordException,
  InvalidUsernameException,
  UsernameTakenException,
} from '../shared/exceptions/domain.exceptions';
import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'findByUsername' | 'create'>
  >;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;
  let service: AuthService;

  beforeEach(() => {
    usersRepository = { findByUsername: jest.fn(), create: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    service = new AuthService(
      usersRepository as unknown as UsersRepository,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    const dto = {
      username: ' @Alice ',
      displayName: ' Alice ',
      password: 'secret1',
    };

    it('cria o usuário com senha em hash e devolve o token', async () => {
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(makeUser());

      const result = await service.register(dto);

      const input = usersRepository.create.mock.calls[0][0];
      expect(input.username).toBe('alice');
      expect(input.displayName).toBe('Alice');
      expect(input.passwordHash).not.toBe('secret1');
      expect(await bcrypt.compare('secret1', input.passwordHash)).toBe(true);
      expect(result.accessToken).toBe('signed-token');
      expect(result.user.username).toBe('alice');
    });

    it('assina o token com o id e o username do usuário', async () => {
      usersRepository.findByUsername.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(makeUser({ id: 'u9' }));

      await service.register(dto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'u9',
        username: 'alice',
      });
    });

    it('rejeita username já utilizado', async () => {
      usersRepository.findByUsername.mockResolvedValue(makeUser());

      await expect(service.register(dto)).rejects.toThrow(
        UsernameTakenException,
      );
      expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it('rejeita username inválido antes de consultar o banco', async () => {
      await expect(
        service.register({ ...dto, username: 'a b' }),
      ).rejects.toThrow(InvalidUsernameException);
      expect(usersRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('rejeita senha curta', async () => {
      usersRepository.findByUsername.mockResolvedValue(null);

      await expect(
        service.register({ ...dto, password: '123' }),
      ).rejects.toThrow(InvalidPasswordException);
      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('autentica com a senha correta', async () => {
      const passwordHash = await bcrypt.hash('secret1', 4);
      usersRepository.findByUsername.mockResolvedValue(
        makeUser({ passwordHash }),
      );

      const result = await service.login({
        username: '@Alice',
        password: 'secret1',
      });

      expect(usersRepository.findByUsername).toHaveBeenCalledWith('alice');
      expect(result.accessToken).toBe('signed-token');
    });

    it('rejeita senha incorreta', async () => {
      const passwordHash = await bcrypt.hash('secret1', 4);
      usersRepository.findByUsername.mockResolvedValue(
        makeUser({ passwordHash }),
      );

      await expect(
        service.login({ username: 'alice', password: 'wrong' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('rejeita usuário inexistente com a mesma exceção', async () => {
      usersRepository.findByUsername.mockResolvedValue(null);

      await expect(
        service.login({ username: 'ghost', password: 'secret1' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });
});
