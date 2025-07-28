/**
 * Middleware system for MCP server
 */

export interface MCPMiddleware {
  name: string;
  beforeToolCall?(toolName: string, params: any): Promise<void> | void;
  afterToolCall?(toolName: string, params: any, result: any): Promise<void> | void;
  onError?(error: Error, context: string, details?: any): Promise<void> | void;
}

export class LoggingMiddleware implements MCPMiddleware {
  name = 'logging';

  beforeToolCall(toolName: string, params: any): void {
    console.log(`[MIDDLEWARE] Calling tool: ${toolName}`, params);
  }

  afterToolCall(toolName: string, params: any, result: any): void {
    console.log(`[MIDDLEWARE] Tool ${toolName} completed`);
  }

  onError(error: Error, context: string, details?: any): void {
    console.error(`[MIDDLEWARE] Error in ${context}:`, error.message, details);
  }
}

export class ValidationMiddleware implements MCPMiddleware {
  name = 'validation';

  beforeToolCall(toolName: string, params: any): void {
    if (!params || typeof params !== 'object') {
      throw new Error(`Invalid parameters for tool ${toolName}: expected object`);
    }
  }
}

export class RateLimitMiddleware implements MCPMiddleware {
  name = 'rate-limit';
  private callCounts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxCalls: number;
  private windowMs: number;

  constructor(maxCalls: number = 100, windowMs: number = 60000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  beforeToolCall(toolName: string, params: any): void {
    const now = Date.now();
    const key = toolName;
    const record = this.callCounts.get(key);

    if (!record || now > record.resetTime) {
      this.callCounts.set(key, { count: 1, resetTime: now + this.windowMs });
      return;
    }

    if (record.count >= this.maxCalls) {
      throw new Error(`Rate limit exceeded for tool ${toolName}`);
    }

    record.count++;
  }
}