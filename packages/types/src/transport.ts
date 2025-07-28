/**
 * Transport layer type definitions
 */

export type TransportType = 'stdio' | 'http' | 'websocket';

export interface TransportConfig {
  type: TransportType;
  options?: Record<string, any>;
}

export interface StdioTransportConfig extends TransportConfig {
  type: 'stdio';
  options?: {
    encoding?: BufferEncoding;
  };
}

export interface HttpTransportConfig extends TransportConfig {
  type: 'http';
  options?: {
    port?: number;
    host?: string;
    cors?: CorsOptions;
    maxBodySize?: string;
    trustProxy?: boolean;
  };
}

export interface WebSocketTransportConfig extends TransportConfig {
  type: 'websocket';
  options?: {
    port?: number;
    host?: string;
    path?: string;
    heartbeatInterval?: number;
    maxConnections?: number;
  };
}

export interface CorsOptions {
  origin?: string | string[] | boolean;
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export interface ServerTransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  send(data: any): Promise<void>;
}