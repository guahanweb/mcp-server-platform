import { 
  UserSession,
  IntentAnalysis,
  WorkflowDefinition,
  OrchestrationConfig,
  SessionStore,
  IntentDetector,
  ContextLoader
} from '@mcp/types';
import { SessionManager } from './session-manager';
import { ContextManager } from './context-manager';
import { WorkflowRegistry } from './workflow-registry';
import { RuleBasedIntentDetector } from './intent-detector';
import { InMemorySessionStore } from './stores';

export class Orchestrator {
  private sessionManager: SessionManager;
  private contextManager: ContextManager;
  private workflowRegistry: WorkflowRegistry;
  private intentDetector: IntentDetector;

  constructor(config: OrchestrationConfig = {}) {
    // Initialize components
    this.workflowRegistry = new WorkflowRegistry();
    this.contextManager = new ContextManager(this.workflowRegistry);
    
    // Use provided or default implementations
    const sessionStore = config.sessionStore || new InMemorySessionStore();
    this.sessionManager = new SessionManager(sessionStore, config.sessionTimeout);
    
    this.intentDetector = config.intentDetector || new RuleBasedIntentDetector(this.workflowRegistry);
  }

  // Workflow registration
  registerWorkflow(definition: WorkflowDefinition): void {
    this.workflowRegistry.register(definition);
  }

  getRegisteredWorkflows(): WorkflowDefinition[] {
    return this.workflowRegistry.getAll();
  }

  // Context management
  registerContextLoader(workflowId: string, loader: ContextLoader): void {
    this.contextManager.registerLoader(workflowId, loader);
  }

  // Main message processing
  async processMessage(
    message: string,
    sessionId?: string,
    userId: string = 'default-user',
    userName: string = 'User'
  ): Promise<{
    session: UserSession;
    intent: IntentAnalysis;
    workflowChanged: boolean;
  }> {
    // Load or create session
    const session = await this.sessionManager.getOrCreateSession(
      sessionId,
      userId,
      userName
    );

    // Add message to conversation history
    await this.sessionManager.addMessage(session.sessionId, {
      id: `msg_${Date.now()}`,
      timestamp: new Date(),
      role: 'user',
      content: message
    });

    // Analyze intent
    const intent = await this.intentDetector.analyzeMessage(message, session);

    // Handle context switching if needed
    let workflowChanged = false;
    if (intent.shouldSwitchWorkflow && intent.targetWorkflow) {
      await this.contextManager.switchContext(
        session,
        intent.targetWorkflow,
        intent.extractedData
      );
      workflowChanged = true;
    }

    // Update session
    await this.sessionManager.updateSession(session);

    return {
      session,
      intent,
      workflowChanged,
    };
  }

  // Session management
  async getSession(sessionId: string): Promise<UserSession | null> {
    return this.sessionManager.getSession(sessionId);
  }

  async createSession(userId: string, userName: string, sessionId?: string): Promise<UserSession> {
    return this.sessionManager.createSession(userId, userName, sessionId);
  }

  async updateSession(session: UserSession): Promise<void> {
    return this.sessionManager.updateSession(session);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessionManager.deleteSession(sessionId);
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    await this.sessionManager.addMessage(sessionId, {
      id: `msg_${Date.now()}`,
      timestamp: new Date(),
      role,
      content
    });
  }

  // Context switching
  async switchWorkflow(
    sessionId: string,
    targetWorkflow: string | undefined,
    initData?: any
  ): Promise<UserSession> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await this.contextManager.switchContext(session, targetWorkflow, initData);
    await this.sessionManager.updateSession(session);
    
    return session;
  }

  // Workflow state management
  async updateWorkflowProgress(
    sessionId: string,
    step: string,
    percentage: number
  ): Promise<void> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    this.contextManager.updateWorkflowProgress(session, step, percentage);
    await this.sessionManager.updateSession(session);
  }

  async addWorkflowCheckpoint(
    sessionId: string,
    description?: string,
    data?: any
  ): Promise<void> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    this.contextManager.addWorkflowCheckpoint(session, description, data);
    await this.sessionManager.updateSession(session);
  }

  // Analytics and monitoring
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    topWorkflows: Array<{ workflow: string; count: number }>;
  }> {
    return this.sessionManager.getStats();
  }

  async cleanupExpiredSessions(): Promise<number> {
    return this.sessionManager.cleanup();
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      sessionStore: boolean;
      workflowRegistry: boolean;
      contextManager: boolean;
      intentDetector: boolean;
    };
    metrics: {
      activeSessions: number;
      registeredWorkflows: number;
      uptime: number;
    };
  }> {
    const components = {
      sessionStore: true, // TODO: Add health check to session store
      workflowRegistry: this.workflowRegistry.getAll().length > 0,
      contextManager: true, // TODO: Add health check to context manager
      intentDetector: true, // TODO: Add health check to intent detector
    };

    const allHealthy = Object.values(components).every(Boolean);
    const status = allHealthy ? 'healthy' : 'degraded';

    const stats = await this.getSessionStats();

    return {
      status,
      components,
      metrics: {
        activeSessions: stats.activeSessions,
        registeredWorkflows: this.workflowRegistry.getAll().length,
        uptime: process.uptime() * 1000, // Convert to milliseconds
      },
    };
  }

  // Utility methods for testing/debugging
  getWorkflowRegistry(): WorkflowRegistry {
    return this.workflowRegistry;
  }

  getContextManager(): ContextManager {
    return this.contextManager;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getIntentDetector(): IntentDetector {
    return this.intentDetector;
  }
}