import { describe, it, expect, vi } from 'vitest';
import { createLogger } from './logger';

// Mock console methods
const consoleSpy = {
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
  info: vi.spyOn(console, 'info').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

describe('Logger', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a logger with default level', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
  });

  it('should respect log level filtering', () => {
    const logger = createLogger('warn');
    
    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(consoleSpy.debug).not.toHaveBeenCalled();
    expect(consoleSpy.info).not.toHaveBeenCalled();
    expect(consoleSpy.warn).toHaveBeenCalled();
    expect(consoleSpy.error).toHaveBeenCalled();
  });

  it('should include prefix in log messages', () => {
    const logger = createLogger('info', 'TEST');
    
    logger.info('test message');
    
    expect(consoleSpy.info).toHaveBeenCalledWith(
      expect.stringContaining('[TEST]')
    );
  });
});