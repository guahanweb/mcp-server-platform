/**
 * Core MCP (Model Context Protocol) type definitions
 */
interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
    };
    handler: (parameters: any, context: PluginContext) => Promise<any>;
}
interface MCPResourceDefinition {
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    handler: (context: PluginContext) => Promise<any>;
}
interface MCPPromptDefinition {
    name: string;
    description: string;
    arguments?: {
        name: string;
        description: string;
        required?: boolean;
    }[];
    handler: (args: Record<string, any>, context: PluginContext) => Promise<{
        messages: MCPMessage[];
    }>;
}
interface MCPMessage {
    role: 'user' | 'assistant' | 'system';
    content: {
        type: 'text' | 'image';
        text?: string;
        image_url?: string;
    };
}
interface MCPRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any;
}
interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: MCPError;
}
interface MCPError {
    code: number;
    message: string;
    data?: any;
}
declare enum MCPErrorCode {
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603
}
interface UserRequestContext {
    sessionId: string;
    userId: string;
    currentWorkflow?: string;
    message: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}
interface PluginContext {
    registerTool(tool: MCPToolDefinition): void;
    registerResource(resource: MCPResourceDefinition): void;
    registerPrompt(prompt: MCPPromptDefinition): void;
    logger: Logger;
    getRequestContext(): UserRequestContext | null;
    getWorkflowState<T = any>(): T | undefined;
    updateWorkflowState<T = any>(state: T): Promise<void>;
    config: Record<string, any>;
}
interface Logger {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
}

/**
 * Plugin system type definitions
 */
interface MCPPlugin {
    metadata: PluginMetadata;
    initialize(this: PluginContext): Promise<void>;
    shutdown?(): Promise<void>;
}
interface PluginMetadata {
    id: string;
    name: string;
    version: string;
    description: string;
    author?: string;
    license?: string;
    repository?: string;
    keywords?: string[];
    category?: string;
    homepage?: string;
    dependencies?: string[];
}
interface WorkflowPluginMetadata extends PluginMetadata {
    triggers: string[];
    tools: string[];
    contextRequirements: string[];
    capabilities?: string[];
    exitSignals?: string[];
}
interface PluginConfig {
    enabled?: boolean;
    config?: Record<string, any>;
    priority?: number;
}
interface PluginRegistry {
    register(plugin: MCPPlugin, config?: PluginConfig): Promise<void>;
    unregister(pluginId: string): Promise<void>;
    get(pluginId: string): MCPPlugin | undefined;
    getAll(): MCPPlugin[];
    isRegistered(pluginId: string): boolean;
}

/**
 * Orchestration layer type definitions
 */
interface UserSession {
    sessionId: string;
    userId: string;
    userName: string;
    activeWorkflow?: string;
    currentContext: string;
    globalContext: GlobalContext;
    workflowContext?: WorkflowContext;
    conversationHistory: ConversationEntry[];
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, any>;
}
interface GlobalContext {
    userId: string;
    userName: string;
    preferences?: UserPreferences;
    activeProjects?: string[];
    recentWorkflows?: string[];
}
interface UserPreferences {
    theme?: string;
    language?: string;
    timezone?: string;
    communicationStyle?: string;
    customSettings?: Record<string, any>;
}
interface WorkflowContext {
    workflowId: string;
    state: WorkflowState;
    hydratedData: Record<string, any>;
    tools: string[];
    history: WorkflowHistoryEntry[];
    checkpoints: WorkflowCheckpoint[];
}
interface WorkflowState {
    workflowId: string;
    currentStep: string;
    data: Record<string, any>;
    metadata: WorkflowMetadata;
    checkpoints: WorkflowCheckpoint[];
}
interface WorkflowMetadata {
    startedAt: Date;
    lastModified: Date;
    completionPercentage: number;
    isDraft: boolean;
    tags?: string[];
}
interface WorkflowCheckpoint {
    id: string;
    timestamp: Date;
    step: string;
    description?: string;
    data: Record<string, any>;
}
interface WorkflowHistoryEntry {
    timestamp: Date;
    action: string;
    details: Record<string, any>;
}
interface ConversationEntry {
    id: string;
    timestamp: Date;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: {
        workflowId?: string;
        toolCalls?: any[];
        intentAnalysis?: IntentAnalysis;
    };
}
interface IntentAnalysis {
    confidence: number;
    intents: Intent[];
    entities: ExtractedEntity[];
    shouldSwitchWorkflow: boolean;
    targetWorkflow?: string;
    extractedData?: Record<string, any>;
}
interface Intent {
    name: string;
    confidence: number;
    parameters?: Record<string, any>;
}
interface ExtractedEntity {
    type: string;
    value: string;
    confidence: number;
    startIndex?: number;
    endIndex?: number;
}
interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    triggers: string[];
    capabilities: string[];
    requiredContext: string[];
    optionalContext?: string[];
    exitSignals?: string[];
    category?: string;
    tags?: string[];
}
interface OrchestrationConfig {
    sessionStore?: SessionStore;
    intentDetector?: IntentDetector;
    contextLoader?: ContextLoader;
    defaultWorkflow?: string;
    sessionTimeout?: number;
}
interface SessionStore {
    get(sessionId: string): Promise<UserSession | null>;
    set(session: UserSession): Promise<void>;
    delete(sessionId: string): Promise<void>;
    exists(sessionId: string): Promise<boolean>;
    cleanup?(olderThan: Date): Promise<number>;
}
interface IntentDetector {
    analyzeMessage(message: string, session: UserSession): Promise<IntentAnalysis>;
}
interface ContextLoader {
    loadContext(workflowId: string, sessionId: string, entities?: string[]): Promise<WorkflowContext>;
    hydrateContext(context: WorkflowContext, entities: string[]): Promise<WorkflowContext>;
}

/**
 * Transport layer type definitions
 */
type TransportType = 'stdio' | 'http' | 'websocket';
interface TransportConfig {
    type: TransportType;
    options?: Record<string, any>;
}
interface StdioTransportConfig extends TransportConfig {
    type: 'stdio';
    options?: {
        encoding?: BufferEncoding;
    };
}
interface HttpTransportConfig extends TransportConfig {
    type: 'http';
    options?: {
        port?: number;
        host?: string;
        cors?: CorsOptions;
        maxBodySize?: string;
        trustProxy?: boolean;
    };
}
interface WebSocketTransportConfig extends TransportConfig {
    type: 'websocket';
    options?: {
        port?: number;
        host?: string;
        path?: string;
        heartbeatInterval?: number;
        maxConnections?: number;
    };
}
interface CorsOptions {
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
}
interface ServerTransport {
    start(): Promise<void>;
    stop(): Promise<void>;
    on(event: string, handler: (...args: any[]) => void): void;
    off(event: string, handler: (...args: any[]) => void): void;
    send(data: any): Promise<void>;
}

/**
 * Logging type definitions
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
interface LoggerConfig {
    level?: LogLevel;
    prefix?: string;
    timestamp?: boolean;
    colors?: boolean;
    transports?: LogTransport[];
}
interface LogTransport {
    name: string;
    level?: LogLevel;
    write(level: LogLevel, message: string, ...args: any[]): void;
}
interface ConsoleTransportConfig {
    colors?: boolean;
    timestamp?: boolean;
    prefix?: string;
}
interface FileTransportConfig {
    filename: string;
    maxSize?: string;
    maxFiles?: number;
    level?: LogLevel;
    timestamp?: boolean;
}

export { type ConsoleTransportConfig, type ContextLoader, type ConversationEntry, type CorsOptions, type ExtractedEntity, type FileTransportConfig, type GlobalContext, type HttpTransportConfig, type Intent, type IntentAnalysis, type IntentDetector, type LogLevel, type LogTransport, type Logger, type LoggerConfig, type MCPError, MCPErrorCode, type MCPMessage, type MCPPlugin, type MCPPromptDefinition, type MCPRequest, type MCPResourceDefinition, type MCPResponse, type MCPToolDefinition, type OrchestrationConfig, type PluginConfig, type PluginContext, type PluginMetadata, type PluginRegistry, type ServerTransport, type SessionStore, type StdioTransportConfig, type TransportConfig, type TransportType, type UserPreferences, type UserRequestContext, type UserSession, type WebSocketTransportConfig, type WorkflowCheckpoint, type WorkflowContext, type WorkflowDefinition, type WorkflowHistoryEntry, type WorkflowMetadata, type WorkflowPluginMetadata, type WorkflowState };
