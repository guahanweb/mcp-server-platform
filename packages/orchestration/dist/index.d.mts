import { SessionStore, UserSession, ConversationEntry, WorkflowDefinition, ContextLoader, OrchestrationConfig, IntentAnalysis, IntentDetector } from '@mcp/types';

declare class SessionManager {
    private store;
    private sessionTimeout;
    constructor(store: SessionStore, sessionTimeout?: number);
    createSession(userId: string, userName: string, sessionId?: string): Promise<UserSession>;
    getSession(sessionId: string): Promise<UserSession | null>;
    getOrCreateSession(sessionId: string | undefined, userId: string, userName: string): Promise<UserSession>;
    updateSession(session: UserSession): Promise<void>;
    deleteSession(sessionId: string): Promise<boolean>;
    addMessage(sessionId: string, message: ConversationEntry): Promise<void>;
    getStats(): Promise<{
        totalSessions: number;
        activeSessions: number;
        averageSessionDuration: number;
        topWorkflows: Array<{
            workflow: string;
            count: number;
        }>;
    }>;
    cleanup(): Promise<number>;
    private generateSessionId;
}

declare class WorkflowRegistry {
    private workflows;
    register(definition: WorkflowDefinition): void;
    get(id: string): WorkflowDefinition | undefined;
    getAll(): WorkflowDefinition[];
    findByTrigger(trigger: string): WorkflowDefinition[];
    findByCategory(category: string): WorkflowDefinition[];
    unregister(id: string): boolean;
    clear(): void;
    has(id: string): boolean;
    size(): number;
}

declare class ContextManager {
    private registry;
    private loaders;
    constructor(registry: WorkflowRegistry);
    registerLoader(workflowId: string, loader: ContextLoader): void;
    switchContext(session: UserSession, targetWorkflow: string | undefined, initData?: any): Promise<UserSession>;
    updateWorkflowProgress(session: UserSession, step: string, percentage: number): UserSession;
    addWorkflowCheckpoint(session: UserSession, description?: string, data?: any): UserSession;
}

declare class Orchestrator {
    private sessionManager;
    private contextManager;
    private workflowRegistry;
    private intentDetector;
    constructor(config?: OrchestrationConfig);
    registerWorkflow(definition: WorkflowDefinition): void;
    getRegisteredWorkflows(): WorkflowDefinition[];
    registerContextLoader(workflowId: string, loader: ContextLoader): void;
    processMessage(message: string, sessionId?: string, userId?: string, userName?: string): Promise<{
        session: UserSession;
        intent: IntentAnalysis;
        workflowChanged: boolean;
    }>;
    getSession(sessionId: string): Promise<UserSession | null>;
    createSession(userId: string, userName: string, sessionId?: string): Promise<UserSession>;
    updateSession(session: UserSession): Promise<void>;
    deleteSession(sessionId: string): Promise<boolean>;
    addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void>;
    switchWorkflow(sessionId: string, targetWorkflow: string | undefined, initData?: any): Promise<UserSession>;
    updateWorkflowProgress(sessionId: string, step: string, percentage: number): Promise<void>;
    addWorkflowCheckpoint(sessionId: string, description?: string, data?: any): Promise<void>;
    getSessionStats(): Promise<{
        totalSessions: number;
        activeSessions: number;
        averageSessionDuration: number;
        topWorkflows: Array<{
            workflow: string;
            count: number;
        }>;
    }>;
    cleanupExpiredSessions(): Promise<number>;
    healthCheck(): Promise<{
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
    }>;
    getWorkflowRegistry(): WorkflowRegistry;
    getContextManager(): ContextManager;
    getSessionManager(): SessionManager;
    getIntentDetector(): IntentDetector;
}

declare class RuleBasedIntentDetector implements IntentDetector {
    private registry;
    constructor(registry: WorkflowRegistry);
    analyzeMessage(message: string, session: UserSession): Promise<IntentAnalysis>;
    private calculateConfidence;
    private fuzzyMatch;
    private extractEntities;
    private extractWorkflowData;
}

declare class InMemorySessionStore implements SessionStore {
    private sessions;
    get(sessionId: string): Promise<UserSession | null>;
    set(session: UserSession): Promise<void>;
    delete(sessionId: string): Promise<void>;
    exists(sessionId: string): Promise<boolean>;
    cleanup(olderThan: Date): Promise<number>;
    clear(): void;
    size(): number;
    getAll(): UserSession[];
}

interface RedisConfig {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    ttl?: number;
}
declare class RedisSessionStore implements SessionStore {
    private config;
    private keyPrefix;
    private ttl;
    constructor(config?: RedisConfig);
    private getKey;
    get(sessionId: string): Promise<UserSession | null>;
    set(session: UserSession): Promise<void>;
    delete(sessionId: string): Promise<void>;
    exists(sessionId: string): Promise<boolean>;
    cleanup(olderThan: Date): Promise<number>;
}

export { ContextManager, InMemorySessionStore, Orchestrator, type RedisConfig, RedisSessionStore, RuleBasedIntentDetector, SessionManager, WorkflowRegistry };
