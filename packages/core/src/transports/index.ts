import { TransportConfig, ServerTransport, Logger } from '@mcp/types';
import { HttpTransport } from './http';
import { WebSocketTransport } from './websocket';
import { StdioTransport } from './stdio';

export * from './http';
export * from './websocket';
export * from './stdio';

export function createTransport(config: TransportConfig, logger: Logger): ServerTransport {
  switch (config.type) {
    case 'stdio':
      return new StdioTransport(logger);
    case 'http':
      return new HttpTransport(config.options || {}, logger);
    case 'websocket':
      return new WebSocketTransport(config.options || {}, logger);
    default:
      throw new Error(`Unsupported transport type: ${(config as any).type}`);
  }
}