import { makeUser } from '../../test/support/factories';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersRepository: jest.Mocked<
    Pick<UsersRepository, 'searchByUsernamePrefix'>
  >;
  let service: UsersService;

  beforeEach(() => {
    usersRepository = { searchByUsernamePrefix: jest.fn() };
    service = new UsersService(usersRepository as unknown as UsersRepository);
  });

  it.each(['', '   ', '@'])(
    'devolve lista vazia para a busca "%s" sem consultar o banco',
    async (query) => {
      await expect(service.search(query, 'me')).resolves.toEqual([]);
      expect(usersRepository.searchByUsernamePrefix).not.toHaveBeenCalled();
    },
  );

  it('normaliza o termo e mapeia os usuários para o resumo público', async () => {
    usersRepository.searchByUsernamePrefix.mockResolvedValue([
      makeUser({ id: 'u2', username: 'bob', displayName: 'Bob' }),
    ]);

    const result = await service.search(' @BO ', 'me');

    expect(usersRepository.searchByUsernamePrefix).toHaveBeenCalledWith(
      'bo',
      'me',
      10,
    );
    expect(result).toEqual([
      { id: 'u2', username: 'bob', displayName: 'Bob', avatarUrl: null },
    ]);
  });
});
