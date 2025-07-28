import { describe, it, expect } from 'vitest';
import * as types from './index';

describe('@mcp/types', () => {
  it('should export all type definitions', () => {
    expect(types).toBeDefined();
  });

  it('should export MCPErrorCode enum', () => {
    expect(types.MCPErrorCode).toBeDefined();
    expect(types.MCPErrorCode.ParseError).toBe(-32700);
    expect(types.MCPErrorCode.InvalidRequest).toBe(-32600);
  });
});