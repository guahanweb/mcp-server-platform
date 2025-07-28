import { UserSession, ConversationEntry, SessionStore } from '@mcp/types';

export class SessionManager {
  private store: SessionStore;
  private sessionTimeout: number;

  constructor(store: SessionStore, sessionTimeout: number = 30 * 60 * 1000) { // 30 minutes default
    this.store = store;
    this.sessionTimeout = sessionTimeout;
  }

  async createSession(userId: string, userName: string, sessionId?: string): Promise<UserSession> {
    const session: UserSession = {
      sessionId: sessionId || this.generateSessionId(),
      userId,
      userName,
      currentContext: 'general',
      globalContext: {
        userId,
        userName,
        preferences: {},
        activeProjects: [],
        recentWorkflows: []
      },
      conversationHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.store.set(session);
    return session;
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.store.get(sessionId);
  }

  async getOrCreateSession(sessionId: string | undefined, userId: string, userName: string): Promise<UserSession> {
    if (sessionId) {
      const existing = await this.getSession(sessionId);
      if (existing) {
        return existing;
      }
    }
    return this.createSession(userId, userName, sessionId);
  }

  async updateSession(session: UserSession): Promise<void> {
    session.updatedAt = new Date();
    await this.store.set(session);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const exists = await this.store.exists(sessionId);
    if (exists) {
      await this.store.delete(sessionId);
      return true;
    }
    return false;
  }

  async addMessage(sessionId: string, message: ConversationEntry): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.conversationHistory.push(message);
      await this.updateSession(session);
    }
  }

  async getStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    topWorkflows: Array<{ workflow: string; count: number }>;
  }> {
    // This would need implementation in the session store
    return {
      totalSessions: 0,
      activeSessions: 0,
      averageSessionDuration: 0,
      topWorkflows: []
    };
  }

  async cleanup(): Promise<number> {
    const cutoffTime = new Date(Date.now() - this.sessionTimeout);
    if (this.store.cleanup) {
      return this.store.cleanup(cutoffTime);
    }
    return 0;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}