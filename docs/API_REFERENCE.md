# API Reference

Complete API reference for the MCP Server Platform.

## Core Server (`@mcp/server-core`)

### MCPServer

The main server class for creating MCP servers.

#### Constructor

```typescript
new MCPServer(config: MCPServerConfig)
```

**MCPServerConfig:**
```typescript
interface MCPServerConfig {
  name: string;                 // Server name
  version: string;              // Server version
  transport: TransportConfig;   // Transport configuration
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  middleware?: MCPMiddleware[]; // Optional middleware
  cors?: {                     // CORS settings (HTTP transport only)
    origin?: string | string[] | boolean;
    credentials?: boolean;
  };
}
```

**TransportConfig:**
```typescript
type TransportConfig = 
  | { type: 'stdio' }
  | { 
      type: 'http'; 
      options?: {
        port?: number;
        host?: string;
        cors?: CorsOptions;
        maxBodySize?: string;
        trustProxy?: boolean;
      };
    }
  | { 
      type: 'websocket'; 
      options?: {
        port?: number;
        host?: string;
        heartbeatInterval?: number;
      };
    };
```

#### Methods

##### `registerPlugin(plugin: MCPPlugin, config?: any): Promise<void>`

Register a plugin with the server.

```typescript
const plugin = new MyPlugin();
await server.registerPlugin(plugin, { apiKey: 'secret' });
```

##### `start(): Promise<void>`

Start the MCP server.

```typescript
await server.start();
```

##### `shutdown(): Promise<void>`

Gracefully shutdown the server.

```typescript
await server.shutdown();
```

##### `getLoadedPlugins(): string[]`

Get list of loaded plugin names.

```typescript
const plugins = server.getLoadedPlugins();
console.log('Loaded plugins:', plugins);
```

## Plugin Base (`@mcp/plugin-base`)

### BasePlugin

Abstract base class for creating MCP plugins.

#### Properties

```typescript
abstract metadata: PluginMetadata;
```

**PluginMetadata:**
```typescript
interface PluginMetadata {
  id: string;          // Unique plugin identifier
  name: string;        // Human-readable name
  version: string;     // Semantic version
  description: string; // Plugin description
}
```

#### Methods

##### `defineTools(): MCPToolDefinition[]`

Define the tools provided by this plugin.

```typescript
protected defineTools(): MCPToolDefinition[] {
  return [
    this.createTool(
      'tool_name',
      'Tool description',
      { /* input schema */ },
      ['required_param'],
      this.handleTool.bind(this)
    )
  ];
}
```

##### `defineResources(): MCPResourceDefinition[]`

Define the resources provided by this plugin.

```typescript
protected defineResources(): MCPResourceDefinition[] {
  return [
    this.createResource(
      'resource://uri',
      'Resource Name',
      'Resource description',
      this.handleResource.bind(this),
      'application/json'
    )
  ];
}
```

##### `definePrompts(): MCPPromptDefinition[]`

Define the prompts provided by this plugin.

```typescript
protected definePrompts(): MCPPromptDefinition[] {
  return [
    this.createPrompt(
      'prompt_name',
      'Prompt description',
      { /* arguments schema */ },
      this.handlePrompt.bind(this)
    )
  ];
}
```

##### `onInitialize(): Promise<void>`

Called when the plugin is initialized.

```typescript
protected async onInitialize(): Promise<void> {
  // Plugin initialization logic
  console.log('Plugin initialized');
}
```

##### `shutdown(): Promise<void>`

Called when the plugin is being shut down.

```typescript
async shutdown(): Promise<void> {
  // Cleanup logic
  console.log('Plugin shutting down');
}
```

#### Helper Methods

##### `createTool()`

Create a tool definition with type safety.

```typescript
protected createTool(
  name: string,
  description: string,
  properties: Record<string, any>,
  required: string[],
  handler: (params: any, context: PluginContext) => Promise<any>
): MCPToolDefinition
```

**Example:**
```typescript
this.createTool(
  'greet',
  'Greet a person by name',
  {
    name: {
      type: 'string',
      description: 'Name of person to greet'
    },
    style: {
      type: 'string',
      enum: ['formal', 'casual'],
      default: 'casual'
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
```

##### `createResource()`

Create a resource definition.

```typescript
protected createResource(
  uri: string,
  name: string,
  description: string,
  handler: (context: PluginContext) => Promise<any>,
  mimeType?: string
): MCPResourceDefinition
```

##### `toolName(name: string): string`

Get the full tool name with plugin prefix.

```typescript
const fullName = this.toolName('greet'); // Returns "plugin-id:greet"
```

## Types (`@mcp/types`)

### Core Types

#### MCPPlugin

```typescript
interface MCPPlugin {
  metadata: PluginMetadata;
  initialize(this: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
}
```

#### PluginContext

```typescript
interface PluginContext {
  pluginId: string;
  logger: Logger;
  registerTool(tool: MCPToolDefinition): void;
  registerResource(resource: MCPResourceDefinition): void;
  registerPrompt(prompt: MCPPromptDefinition): void;
  getRequestContext(): UserRequestContext | null;
  getWorkflowState(): any;
  setWorkflowState(state: any): void;
}
```

#### MCPToolDefinition

```typescript
interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  handler: (params: any, context: PluginContext) => Promise<any>;
}
```

#### MCPResourceDefinition

```typescript
interface MCPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  handler: (context: PluginContext) => Promise<any>;
}
```

#### UserRequestContext

```typescript
interface UserRequestContext {
  sessionId: string;
  userId: string;
  currentWorkflow?: string;
  message: string;
  metadata: {
    userAgent?: string;
    ip?: string;
    timestamp: Date;
  };
}
```

### Response Formats

#### Tool Response

```typescript
interface ToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

#### Resource Response

```typescript
interface ResourceResponse {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}
```

## Transport Details

### STDIO Transport

Used for Claude Desktop integration and command-line usage.

**Configuration:**
```typescript
{
  type: 'stdio'
}
```

**Usage:**
- Reads JSON-RPC messages from stdin
- Writes responses to stdout
- Logs to stderr
- Perfect for AI assistant integration

### HTTP Transport

RESTful HTTP transport with CORS support.

**Configuration:**
```typescript
{
  type: 'http',
  options: {
    port: 3000,
    host: 'localhost',
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    },
    maxBodySize: '10mb',
    trustProxy: false
  }
}
```

**Endpoints:**
- `POST /mcp` - Main MCP endpoint
- `GET /health` - Health check endpoint

**Headers:**
- `x-session-id` - Session identifier
- `x-user-id` - User identifier  
- `x-workflow-id` - Workflow identifier

### WebSocket Transport

Real-time bidirectional communication.

**Configuration:**
```typescript
{
  type: 'websocket',
  options: {
    port: 3001,
    host: 'localhost',
    heartbeatInterval: 30000
  }
}
```

**Features:**
- Automatic heartbeat/ping-pong
- Connection management
- Real-time message exchange

## Middleware System

Middleware functions that run before tool execution.

### MCPMiddleware Interface

```typescript
interface MCPMiddleware {
  beforeToolCall?: (toolName: string, params: any) => Promise<void>;
  afterToolCall?: (toolName: string, params: any, result: any) => Promise<void>;
  onError?: (error: Error, toolName: string, params: any) => Promise<void>;
}
```

### Built-in Middleware

#### Logging Middleware

```typescript
import { loggingMiddleware } from '@mcp/server-core/middleware';

const server = new MCPServer({
  // ... other config
  middleware: [loggingMiddleware()]
});
```

#### Rate Limiting Middleware

```typescript
import { rateLimitMiddleware } from '@mcp/server-core/middleware';

const server = new MCPServer({
  // ... other config
  middleware: [
    rateLimitMiddleware({
      windowMs: 60000, // 1 minute
      maxRequests: 100 // 100 requests per minute
    })
  ]
});
```

#### Validation Middleware

```typescript
import { validationMiddleware } from '@mcp/server-core/middleware';

const server = new MCPServer({
  // ... other config
  middleware: [validationMiddleware()]
});
```

### Custom Middleware

```typescript
const customMiddleware: MCPMiddleware = {
  beforeToolCall: async (toolName, params) => {
    console.log(`Calling tool: ${toolName}`);
    
    // Add custom validation
    if (!params.userId) {
      throw new Error('userId is required');
    }
  },
  
  afterToolCall: async (toolName, params, result) => {
    console.log(`Tool ${toolName} completed`);
  },
  
  onError: async (error, toolName, params) => {
    console.error(`Tool ${toolName} failed:`, error);
    
    // Custom error reporting
    await reportError(error, toolName, params);
  }
};
```

## Error Handling

### Error Types

#### McpError

Standard MCP protocol error.

```typescript
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

throw new McpError(
  ErrorCode.InvalidRequest,
  'Invalid parameter provided'
);
```

**Error Codes:**
- `ErrorCode.ParseError` - JSON parsing error
- `ErrorCode.InvalidRequest` - Invalid request format
- `ErrorCode.MethodNotFound` - Tool/method not found
- `ErrorCode.InvalidParams` - Invalid parameters
- `ErrorCode.InternalError` - Server internal error

#### Custom Errors

```typescript
class PluginError extends Error {
  constructor(message: string, public code: string = 'PLUGIN_ERROR') {
    super(message);
    this.name = 'PluginError';
  }
}

// In tool handler
if (!apiKey) {
  throw new PluginError('API key is required', 'MISSING_API_KEY');
}
```

### Error Response Format

```typescript
{
  content: [{
    type: 'text',
    text: 'Error message here'
  }],
  isError: true
}
```

## Logging

### Logger Interface

```typescript
interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
```

### Usage in Plugins

```typescript
export class MyPlugin extends BasePlugin {
  protected async onInitialize(): Promise<void> {
    // Logger is available through context in handlers
  }

  private async handleTool(params: any, context: PluginContext): Promise<any> {
    context.logger.info('Tool called with params:', params);
    
    try {
      // Tool logic here
      context.logger.debug('Tool processing completed');
      return result;
    } catch (error) {
      context.logger.error('Tool failed:', error);
      throw error;
    }
  }
}
```

## Testing

### Unit Testing Plugins

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyPlugin } from './my-plugin';
import { PluginContext } from '@mcp/types';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let mockContext: PluginContext;

  beforeEach(() => {
    plugin = new MyPlugin();
    mockContext = {
      pluginId: 'test-plugin',
      logger: console,
      registerTool: vi.fn(),
      registerResource: vi.fn(),
      registerPrompt: vi.fn(),
      getRequestContext: vi.fn(),
      getWorkflowState: vi.fn(),
      setWorkflowState: vi.fn()
    };
  });

  it('should define tools correctly', () => {
    const tools = plugin.defineTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('test-plugin:greet');
  });

  it('should handle tool calls', async () => {
    const tools = plugin.defineTools();
    const greetTool = tools.find(t => t.name.includes('greet'));
    
    const result = await greetTool!.handler(
      { name: 'World' },
      mockContext
    );
    
    expect(result.content[0].text).toContain('Hello, World');
  });
});
```

### Integration Testing

```typescript
import { MCPServer } from '@mcp/server-core';
import { MyPlugin } from './my-plugin';

describe('Integration Tests', () => {
  let server: MCPServer;

  beforeEach(async () => {
    server = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      transport: { type: 'stdio' }
    });

    await server.registerPlugin(new MyPlugin());
  });

  afterEach(async () => {
    await server.shutdown();
  });

  it('should start server successfully', async () => {
    await expect(server.start()).resolves.not.toThrow();
  });
});
```

This completes the comprehensive API reference for the MCP Server Platform. The documentation covers all major classes, interfaces, and patterns needed to build robust MCP servers.