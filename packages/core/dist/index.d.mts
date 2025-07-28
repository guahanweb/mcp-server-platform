import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TransportConfig, MCPPlugin, UserRequestContext, Logger, MCPToolDefinition, MCPResourceDefinition, MCPPromptDefinition, CorsOptions, ServerTransport, LogLevel, LoggerConfig } from '@mcp/types';
import { EventEmitter } from 'events';
import { Application } from 'express';

/**
 * Middleware system for MCP server
 */
interface MCPMiddleware {
    name: string;
    beforeToolCall?(toolName: string, params: any): Promise<void> | void;
    afterToolCall?(toolName: string, params: any, result: any): Promise<void> | void;
    onError?(error: Error, context: string, details?: any): Promise<void> | void;
}
declare class LoggingMiddleware implements MCPMiddleware {
    name: string;
    beforeToolCall(toolName: string, params: any): void;
    afterToolCall(toolName: string, params: any, result: any): void;
    onError(error: Error, context: string, details?: any): void;
}
declare class ValidationMiddleware implements MCPMiddleware {
    name: string;
    beforeToolCall(toolName: string, params: any): void;
}
declare class RateLimitMiddleware implements MCPMiddleware {
    name: string;
    private callCounts;
    private maxCalls;
    private windowMs;
    constructor(maxCalls?: number, windowMs?: number);
    beforeToolCall(toolName: string, params: any): void;
}

interface MCPServerConfig {
    name: string;
    version: string;
    transport: TransportConfig;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    middleware?: MCPMiddleware[];
    cors?: {
        origin?: string | string[] | boolean;
        credentials?: boolean;
    };
}
declare class MCPServer {
    private server;
    private transport;
    private pluginManager;
    private logger;
    private config;
    private middleware;
    constructor(config: MCPServerConfig);
    private setupHandlers;
    private setupTransportHandlers;
    private createToolExecutionContext;
    registerPlugin(plugin: MCPPlugin, config?: any): Promise<void>;
    getRegisteredPlugins(): string[];
    start(): Promise<void>;
    private startStdioTransport;
    stop(): Promise<void>;
    setRequestContext(context: UserRequestContext | null): void;
    getServer(): Server;
    private handleToolsList;
    private handleToolCall;
    private handleResourcesList;
    private handleResourceRead;
    private handlePromptsList;
    private handlePromptGet;
}

declare class PluginManager {
    private plugins;
    private tools;
    private resources;
    private prompts;
    private logger;
    private currentRequestContext;
    private workflowStates;
    constructor(logger: Logger);
    registerPlugin(plugin: MCPPlugin, config?: any): Promise<void>;
    private createPluginContext;
    private createPluginLogger;
    shutdownPlugins(): Promise<void>;
    setRequestContext(context: UserRequestContext | null): void;
    getCurrentRequestContext(): UserRequestContext | null;
    getWorkflowState(workflowId: string): any;
    setWorkflowState(workflowId: string, state: any): void;
    getTool(name: string): MCPToolDefinition | undefined;
    getAllTools(): Map<string, MCPToolDefinition>;
    getResource(uri: string): MCPResourceDefinition | undefined;
    getAllResources(): Map<string, MCPResourceDefinition>;
    getPrompt(name: string): MCPPromptDefinition | undefined;
    getAllPrompts(): Map<string, MCPPromptDefinition>;
    getLoadedPluginNames(): string[];
    getPlugin(id: string): MCPPlugin | undefined;
    getAllPlugins(): MCPPlugin[];
}

interface HttpTransportOptions {
    port?: number;
    host?: string;
    cors?: CorsOptions;
    maxBodySize?: string;
    trustProxy?: boolean;
}
declare class HttpTransport extends EventEmitter implements ServerTransport {
    private app;
    private server?;
    private logger;
    private options;
    constructor(options: HttpTransportOptions, logger: Logger);
    private setupMiddleware;
    private setupRoutes;
    start(): Promise<void>;
    stop(): Promise<void>;
    send(data: any): Promise<void>;
    getApp(): Application;
}

interface WebSocketTransportOptions {
    port?: number;
    host?: string;
    path?: string;
    heartbeatInterval?: number;
    maxConnections?: number;
}
declare class WebSocketTransport extends EventEmitter implements ServerTransport {
    private wss?;
    private httpServer?;
    private connections;
    private logger;
    private options;
    private heartbeatInterval?;
    constructor(options: WebSocketTransportOptions, logger: Logger);
    start(): Promise<void>;
    private setupWebSocketHandlers;
    private startHeartbeat;
    private generateConnectionId;
    stop(): Promise<void>;
    send(data: any): Promise<void>;
    broadcast(data: any, filter?: (connectionId: string) => boolean): void;
    getConnectionCount(): number;
}

declare class StdioTransport extends EventEmitter implements ServerTransport {
    private logger;
    constructor(logger: Logger);
    start(): Promise<void>;
    stop(): Promise<void>;
    send(data: any): Promise<void>;
}

declare function createTransport(config: TransportConfig, logger: Logger): ServerTransport;

declare function createLogger(level?: LogLevel, prefix?: string): Logger;
declare class FileLogger implements Logger {
    private config;
    constructor(config: LoggerConfig);
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    private log;
}

export { FileLogger, HttpTransport, type HttpTransportOptions, LoggingMiddleware, type MCPMiddleware, MCPServer, type MCPServerConfig, PluginManager, RateLimitMiddleware, StdioTransport, ValidationMiddleware, WebSocketTransport, type WebSocketTransportOptions, createLogger, createTransport };
