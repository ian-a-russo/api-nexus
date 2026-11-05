import { ConnectionRegistry } from './connection-registry';

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;

  beforeEach(() => {
    registry = new ConnectionRegistry();
  });

  it('considera online quem tem ao menos um socket', () => {
    registry.add('user-1', 'socket-a');

    expect(registry.isOnline('user-1')).toBe(true);
    expect(registry.isOnline('user-2')).toBe(false);
  });

  it('mantém o usuário online enquanto restar outro socket', () => {
    registry.add('user-1', 'socket-a');
    registry.add('user-1', 'socket-b');

    registry.remove('user-1', 'socket-a');

    expect(registry.isOnline('user-1')).toBe(true);
    expect(registry.socketIdsFor('user-1')).toEqual(['socket-b']);
  });

  it('marca como offline ao remover o último socket', () => {
    registry.add('user-1', 'socket-a');

    registry.remove('user-1', 'socket-a');

    expect(registry.isOnline('user-1')).toBe(false);
    expect(registry.socketIdsFor('user-1')).toEqual([]);
  });

  it('ignora a remoção de um usuário desconhecido', () => {
    expect(() => registry.remove('ghost', 'socket-a')).not.toThrow();
  });
});
