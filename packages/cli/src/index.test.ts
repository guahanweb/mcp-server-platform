import { describe, it, expect } from 'vitest';
import * as cli from './index';

describe('@mcp/create-server', () => {
  it('should export all CLI functions', () => {
    expect(cli).toBeDefined();
    expect(cli.initCommand).toBeDefined();
    expect(cli.createPluginCommand).toBeDefined();
    expect(cli.addToolCommand).toBeDefined();
  });
});