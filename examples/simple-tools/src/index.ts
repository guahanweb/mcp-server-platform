import { MCPServer } from '@mcp/server-core';
import { SimpleToolsPlugin } from './plugins/simple-tools';

async function main() {
  const server = new MCPServer({
    name: 'simple-tools-server',
    version: '1.0.0',
    transport: {
      type: 'stdio'
    },
    logLevel: 'info'
  });

  // Register plugins
  await server.registerPlugin(new SimpleToolsPlugin());

  // Start server
  await server.start();
}

main().catch(console.error);