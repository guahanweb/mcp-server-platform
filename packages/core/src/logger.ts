import { Logger, LogLevel, LoggerConfig } from '@mcp/types';

export function createLogger(level: LogLevel = 'info', prefix?: string): Logger {
  const logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  const currentLevel = logLevels[level];
  const logPrefix = prefix ? `[${prefix}]` : '';

  const shouldLog = (msgLevel: LogLevel): boolean => {
    return logLevels[msgLevel] >= currentLevel;
  };

  const formatMessage = (level: LogLevel, message: string, ...args: any[]): string => {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const fullMessage = args.length > 0 ? `${message} ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')}` : message;
    
    return `${timestamp} ${levelStr} ${logPrefix} ${fullMessage}`;
  };

  return {
    debug: (message: string, ...args: any[]) => {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', message, ...args));
      }
    },
    info: (message: string, ...args: any[]) => {
      if (shouldLog('info')) {
        console.info(formatMessage('info', message, ...args));
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', message, ...args));
      }
    },
    error: (message: string, ...args: any[]) => {
      if (shouldLog('error')) {
        console.error(formatMessage('error', message, ...args));
      }
    },
  };
}

export class FileLogger implements Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (this.config.transports) {
      for (const transport of this.config.transports) {
        transport.write(level, message, ...args);
      }
    } else {
      // Default console logging
      const logger = createLogger(this.config.level, this.config.prefix);
      logger[level](message, ...args);
    }
  }
}