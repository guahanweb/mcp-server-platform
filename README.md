# MCP Server Platform

A comprehensive toolkit for building MCP (Model Context Protocol) servers with TypeScript.

## Features

- 🚀 **Easy Setup**: Get an MCP server running in minutes
- 🔌 **Plugin Architecture**: Modular design with hot-swappable plugins
- 🛠️ **Rich Tooling**: CLI tools for scaffolding and development
- 📦 **Multiple Transports**: Support for stdio, HTTP, and WebSocket
- 🎯 **Type Safe**: Full TypeScript support with strict typing
- 🔄 **Orchestration**: Optional workflow management and intent detection
- 📚 **Well Documented**: Comprehensive guides and examples

## Quick Start

```bash
# Create a new MCP server project
npx @mcp/create-server my-mcp-server
cd my-mcp-server

# Install dependencies
npm install

# Start development
npm run dev
```

## Architecture

The platform consists of several packages:

- **`@mcp/types`** - TypeScript types and interfaces
- **`@mcp/server-core`** - Core MCP server implementation
- **`@mcp/plugin-base`** - Base classes for creating plugins
- **`@mcp/orchestration`** - Optional workflow orchestration layer
- **`@mcp/create-server`** - CLI tool for scaffolding projects

## Package Overview

### Core Server (`@mcp/server-core`)

The heart of the platform - a production-ready MCP server implementation.

```typescript
import { MCPServer } from '@mcp/server-core';

const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: { type: 'stdio' },
  logLevel: 'info'
});

await server.registerPlugin(new MyPlugin());
await server.start();
```

**Key Features:**
- Multiple transport support (stdio, HTTP, WebSocket)
- Plugin management with hot reloading
- Middleware system for logging, validation, rate limiting
- Comprehensive error handling and logging
- Health checks and monitoring endpoints

### Plugin Development (`@mcp/plugin-base`)

Create powerful plugins with minimal boilerplate.

```typescript
import { BasePlugin } from '@mcp/plugin-base';
import { PluginMetadata, MCPToolDefinition, PluginContext } from '@mcp/types';

export class MyPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    id: 'my-plugin',
    name: 'My Plugin', 
    version: '1.0.0',
    description: 'An example plugin'
  };

  protected defineTools(): MCPToolDefinition[] {
    return [
      this.createTool(
        'greet',
        'Greet someone by name',
        {
          name: {
            type: 'string',
            description: 'Name to greet'
          }
        },
        ['name'],
        async (params, context) => {
          return {
            content: [{
              type: 'text', 
              text: `Hello, ${params.name}!`
            }]
          };
        }
      )
    ];
  }
}
```

**Key Features:**
- Type-safe tool definitions with schema validation
- Built-in error handling and logging
- Context helpers for session and workflow management
- Resource and prompt support
- Easy testing and mocking

### Orchestration (`@mcp/orchestration`)

Advanced workflow management and intent detection.

```typescript
import { Orchestrator } from '@mcp/orchestration';

const orchestrator = new Orchestrator({
  sessionStore: new RedisSessionStore(),
  intentDetector: new LLMIntentDetector()
});

orchestrator.registerWorkflow({
  id: 'character-creation',
  name: 'Character Creation',
  triggers: ['create character', 'new character'],
  capabilities: ['character_design', 'stat_generation']
});

const result = await orchestrator.processMessage(
  "I want to create a new character",
  sessionId,
  userId
);
```

**Key Features:**
- Session management with persistence
- Intent detection (rule-based or LLM-powered)
- Workflow switching and state management
- Context loading and hydration
- Progress tracking and checkpoints

## Examples

### Weather App Server

A complete weather app demonstrating API integration, error handling, and multiple tools:

```typescript
// examples/weather-app/src/index.ts
import { MCPServer } from '@mcp/server-core';
import { WeatherPlugin } from './weather-plugin';

const server = new MCPServer({
  name: 'weather-server',
  version: '1.0.0', 
  transport: { type: 'stdio' }
});

const weatherPlugin = new WeatherPlugin(process.env.OPENWEATHER_API_KEY);
await server.registerPlugin(weatherPlugin);
await server.start();
```

**Features:**
- Current weather conditions for any location
- 5-day weather forecasts with daily highs/lows
- Location search with coordinates
- Demo mode for testing without API key
- Comprehensive error handling

### Workflow Plugin

A workflow-aware plugin with state management:

```typescript
import { WorkflowPlugin } from '@mcp/plugin-base';

export class CharacterCreationPlugin extends WorkflowPlugin {
  metadata = {
    id: 'character-creation',
    name: 'Character Creation Workflow',
    version: '1.0.0',
    description: 'Create and manage fictional characters',
    triggers: ['character', 'create character'],
    tools: ['create_character', 'edit_character'],
    contextRequirements: []
  };

  protected defineTools() {
    return [
      this.createWorkflowTool(
        'create_character',
        'Create a new character',
        {
          name: { type: 'string', description: 'Character name' },
          class: { type: 'string', enum: ['warrior', 'mage', 'rogue'] }
        },
        ['name', 'class'],
        async (params, context) => {
          const helper = createContextHelper(context);
          await helper.setStateProperty('character', {
            name: params.name,
            class: params.class,
            level: 1,
            createdAt: new Date()
          });
          
          return `Created ${params.class} character named ${params.name}`;
        }
      )
    ];
  }

  getSystemPrompt(): string {
    return `You are a character creation assistant. Help users design detailed fictional characters with stats, backgrounds, and personalities.`;
  }
}
```

## CLI Tools

The platform includes powerful CLI tools for development:

```bash
# Initialize new project
npx @mcp/create-server my-server --template basic

# Create a new plugin
npx @mcp/create-server create-plugin my-plugin --type workflow

# Add a tool to existing plugin
npx @mcp/create-server add-tool my-tool --plugin my-plugin
```

## Transport Options

### STDIO Transport

Perfect for Claude Desktop integration:

```typescript
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: { type: 'stdio' }
});
```

### HTTP Transport

For web applications and REST APIs:

```typescript
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'http',
    options: {
      port: 3000,
      cors: { origin: true }
    }
  }
});
```

### WebSocket Transport

For real-time applications:

```typescript
const server = new MCPServer({
  name: 'my-server',
  version: '1.0.0',
  transport: {
    type: 'websocket',
    options: {
      port: 3001,
      heartbeatInterval: 30000
    }
  }
});
```

## Development

```bash
# Clone the repository
git clone https://github.com/mcp/server-platform
cd server-platform

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start development mode
npm run dev
```

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Documentation

- 📚 **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Step-by-step tutorial for beginners
- 📖 **[API Reference](./docs/API_REFERENCE.md)** - Complete API documentation
- 🔧 **[Plugin Development Guide](./docs/PLUGIN_DEVELOPMENT.md)** - Advanced plugin development
- 🌤️ **[Weather App Example](./examples/weather-app/)** - Complete real-world example

## Examples

The platform includes several working examples to help you get started:

- **[Weather App](./examples/weather-app/)** - Complete weather service with API integration, error handling, and demo mode
- **[Simple Tools](./examples/simple-tools/)** - Basic utility tools and patterns  
- **[Full Orchestration](./examples/full-orchestration/)** - Advanced workflow management

## Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/mcp/server-platform/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/mcp/server-platform/discussions)
- 📖 **MCP Specification**: [Model Context Protocol](https://modelcontextprotocol.io/)