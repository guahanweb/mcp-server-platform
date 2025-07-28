import { ServerTransport, Logger } from '@mcp/types';
import { EventEmitter } from 'events';

export class StdioTransport extends EventEmitter implements ServerTransport {
  private logger: Logger;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
  }

  async start(): Promise<void> {
    this.logger.info('STDIO transport ready (handled by MCP SDK)');
  }

  async stop(): Promise<void> {
    this.logger.info('STDIO transport stopped');
  }

  async send(data: any): Promise<void> {
    // For stdio, this is handled by the MCP SDK
    throw new Error('STDIO transport does not support direct send operations');
  }
}