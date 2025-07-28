import { SessionStore, UserSession } from '@mcp/types';

export class InMemorySessionStore implements SessionStore {
  private sessions: Map<string, UserSession> = new Map();

  async get(sessionId: string): Promise<UserSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async set(session: UserSession): Promise<void> {
    this.sessions.set(session.sessionId, { ...session });
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async cleanup(olderThan: Date): Promise<number> {
    let cleaned = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.updatedAt < olderThan) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    return cleaned;
  }

  // Additional methods for testing/debugging
  clear(): void {
    this.sessions.clear();
  }

  size(): number {
    return this.sessions.size;
  }

  getAll(): UserSession[] {
    return Array.from(this.sessions.values());
  }
}