/**
 * Logging type definitions
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface LoggerConfig {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colors?: boolean;
  transports?: LogTransport[];
}

export interface LogTransport {
  name: string;
  level?: LogLevel;
  write(level: LogLevel, message: string, ...args: any[]): void;
}

export interface ConsoleTransportConfig {
  colors?: boolean;
  timestamp?: boolean;
  prefix?: string;
}

export interface FileTransportConfig {
  filename: string;
  maxSize?: string;
  maxFiles?: number;
  level?: LogLevel;
  timestamp?: boolean;
}