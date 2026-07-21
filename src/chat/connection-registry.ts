export class ConnectionRegistry {
  private readonly socketIdsByUserId = new Map<string, Set<string>>();

  add(userId: string, socketId: string): void {
    const socketIds = this.socketIdsByUserId.get(userId) ?? new Set<string>();
    socketIds.add(socketId);
    this.socketIdsByUserId.set(userId, socketIds);
  }

  remove(userId: string, socketId: string): void {
    const socketIds = this.socketIdsByUserId.get(userId);
    if (!socketIds) {
      return;
    }
    socketIds.delete(socketId);
    if (socketIds.size === 0) {
      this.socketIdsByUserId.delete(userId);
    }
  }

  isOnline(userId: string): boolean {
    return this.socketIdsByUserId.has(userId);
  }

  socketIdsFor(userId: string): string[] {
    return Array.from(this.socketIdsByUserId.get(userId) ?? []);
  }
}
