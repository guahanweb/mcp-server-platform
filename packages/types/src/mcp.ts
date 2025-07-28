/**
 * Core MCP (Model Context Protocol) type definitions
 */

export interface MCPToolDefinition {
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

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  handler: (context: PluginContext) => Promise<any>;
}

export interface MCPPromptDefinition {
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

export interface MCPMessage {
  role: 'user' | 'assistant' | 'system';
  content: {
    type: 'text' | 'image';
    text?: string;
    image_url?: string;
  };
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

export interface UserRequestContext {
  sessionId: string;
  userId: string;
  currentWorkflow?: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PluginContext {
  registerTool(tool: MCPToolDefinition): void;
  registerResource(resource: MCPResourceDefinition): void;
  registerPrompt(prompt: MCPPromptDefinition): void;
  logger: Logger;
  getRequestContext(): UserRequestContext | null;
  getWorkflowState<T = any>(): T | undefined;
  updateWorkflowState<T = any>(state: T): Promise<void>;
  config: Record<string, any>;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}