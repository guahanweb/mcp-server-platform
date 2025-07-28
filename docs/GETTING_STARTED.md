# Getting Started with MCP Server Platform

This guide will walk you through creating your first MCP (Model Context Protocol) server using the MCP Server Platform.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Basic knowledge of TypeScript/JavaScript

## Installation

### Option 1: Create New Project (Recommended)

```bash
# Create a new MCP server project using the CLI
npx @mcp/create-server my-weather-server --template basic
cd my-weather-server

# Install dependencies
npm install

# Start development
npm run dev
```

### Option 2: Add to Existing Project

```bash
# Install core packages
npm install @mcp/server-core @mcp/plugin-base @mcp/types

# Install development dependencies
npm install -D typescript tsup @types/node
```

## Your First MCP Server

Let's create a simple greeting server to understand the basics.

### 1. Create the Plugin

Create `src/greeting-plugin.ts`:

```typescript
import { BasePlugin } from '@mcp/plugin-base';
import { PluginMetadata, MCPToolDefinition, PluginContext } from '@mcp/types';

export class GreetingPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    id: 'greeting',
    name: 'Greeting Plugin',
    version: '1.0.0',
    description: 'A simple greeting plugin to demonstrate MCP basics'
  };

  protected defineTools(): MCPToolDefinition[] {
    return [
      // Simple greeting tool
      this.createTool(
        'greet',
        'Greet someone with a personalized message',
        {
          name: {
            type: 'string',
            description: 'The name of the person to greet'
          },
          style: {
            type: 'string',
            enum: ['casual', 'formal', 'enthusiastic'],
            description: 'The style of greeting to use',
            default: 'casual'
          }
        },
        ['name'], // required parameters
        this.handleGreeting.bind(this)
      ),

      // Tool with multiple parameters
      this.createTool(
        'farewell',
        'Say goodbye with optional message',
        {
          name: {
            type: 'string',
            description: 'The name of the person'
          },
          message: {
            type: 'string',
            description: 'Optional custom farewell message'
          },
          includeWish: {
            type: 'boolean',
            description: 'Include a good wish',
            default: false
          }
        },
        ['name'],
        this.handleFarewell.bind(this)
      )
    ];
  }

  private async handleGreeting(params: any, context: PluginContext): Promise<any> {
    const { name, style = 'casual' } = params;
    
    let greeting: string;
    switch (style) {
      case 'formal':
        greeting = `Good day, ${name}. It is a pleasure to make your acquaintance.`;
        break;
      case 'enthusiastic':
        greeting = `Hey there, ${name}! 🎉 So excited to meet you!`;
        break;
      default:
        greeting = `Hi ${name}, nice to meet you!`;
    }

    return {
      content: [{
        type: 'text',
        text: greeting
      }]
    };
  }

  private async handleFarewell(params: any, context: PluginContext): Promise<any> {
    const { name, message, includeWish = false } = params;
    
    let farewell = message || `Goodbye, ${name}!`;
    
    if (includeWish) {
      farewell += ' Have a wonderful day!';
    }

    return {
      content: [{
        type: 'text',
        text: farewell
      }]
    };
  }
}
```

### 2. Create the Server

Create `src/index.ts`:

```typescript
#!/usr/bin/env node

import { MCPServer } from '@mcp/server-core';
import { GreetingPlugin } from './greeting-plugin.js';

async function main() {
  // Create server with stdio transport for CLI usage
  const server = new MCPServer({
    name: 'greeting-server',
    version: '1.0.0',
    transport: { type: 'stdio' },
    logLevel: 'info'
  });

  // Register the greeting plugin
  const greetingPlugin = new GreetingPlugin();
  await server.registerPlugin(greetingPlugin);

  // Start the server
  try {
    await server.start();
    console.error('🚀 Greeting MCP Server started successfully!');
    console.error('Available tools:');
    console.error('  - greet: Greet someone with different styles');
    console.error('  - farewell: Say goodbye with optional custom message');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n👋 Server shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});
```

### 3. Setup Build Configuration

Create `package.json`:

```json
{
  "name": "greeting-server",
  "version": "1.0.0",
  "description": "Simple MCP greeting server",
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "greeting-server": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@mcp/server-core": "^0.1.0",
    "@mcp/plugin-base": "^0.1.0",
    "@mcp/types": "^0.1.0"
  },
  "devDependencies": {
    "tsup": "^8.5.0",
    "typescript": "^5.8.3",
    "@types/node": "^24.1.0"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

Create `tsup.config.ts`:

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'node18',
  outDir: 'dist'
});
```

### 4. Build and Test

```bash
# Build the server
npm run build

# Test the server (starts in stdio mode)
npm start
```

## Using with Claude Desktop

To use your MCP server with Claude Desktop, add it to your MCP configuration:

### macOS Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "greeting": {
      "command": "node",
      "args": ["/path/to/your/greeting-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### Windows Configuration

Edit `%APPDATA%/Claude/claude_desktop_config.json` with the same structure.

## Next Steps

Now that you have a basic MCP server running, you can:

1. **Add More Tools**: Extend your plugin with additional tools
2. **Add Resources**: Provide static or dynamic resources
3. **Add Error Handling**: Implement robust error handling
4. **Add State Management**: Use context for stateful interactions
5. **Explore Advanced Features**: Try HTTP transport, middleware, or orchestration

## Common Patterns

### Tool with File Operations

```typescript
this.createTool(
  'read_file',
  'Read the contents of a file',
  {
    path: {
      type: 'string',
      description: 'Path to the file to read'
    }
  },
  ['path'],
  async (params, context) => {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(params.path, 'utf-8');
      
      return {
        content: [{
          type: 'text',
          text: content
        }]
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
)
```

### Tool with API Integration

```typescript
this.createTool(
  'fetch_data',
  'Fetch data from an external API',
  {
    url: {
      type: 'string',
      description: 'URL to fetch data from'
    }
  },
  ['url'],
  async (params, context) => {
    try {
      const response = await fetch(params.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }
)
```

### Tool with State Management

```typescript
private state = new Map<string, any>();

this.createTool(
  'set_preference',
  'Set a user preference',
  {
    key: { type: 'string', description: 'Preference key' },
    value: { type: 'string', description: 'Preference value' }
  },
  ['key', 'value'],
  async (params, context) => {
    this.state.set(params.key, params.value);
    
    return {
      content: [{
        type: 'text',
        text: `Preference ${params.key} set to: ${params.value}`
      }]
    };
  }
)
```

## Troubleshooting

### Common Issues

1. **Build Errors**: Make sure all dependencies are installed and TypeScript configuration is correct
2. **Runtime Errors**: Check that your tool handlers return the correct response format
3. **Connection Issues**: Verify your Claude Desktop configuration path and syntax
4. **Plugin Not Loading**: Ensure the plugin is properly registered with the server

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: { type: 'stdio' },
  logLevel: 'debug' // Enable debug logging
});
```

## Resources

- [Weather App Example](../examples/weather-app/) - A complete real-world example
- [API Reference](./API.md) - Detailed API documentation
- [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md) - Advanced plugin features
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment strategies

## Support

- [GitHub Issues](https://github.com/mcp/server-platform/issues)
- [Documentation](https://docs.mcp-platform.dev)
- [Community Discord](https://discord.gg/mcp-platform)