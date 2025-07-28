# Plugin Development Guide

This guide covers advanced topics for developing robust, production-ready MCP plugins.

## Plugin Architecture

### Plugin Lifecycle

Understanding the plugin lifecycle is crucial for proper resource management:

1. **Construction** - Plugin instance is created
2. **Registration** - Plugin is registered with the server
3. **Initialization** - `onInitialize()` is called with context
4. **Runtime** - Tools, resources, and prompts are executed
5. **Shutdown** - `shutdown()` is called for cleanup

```typescript
export class MyPlugin extends BasePlugin {
  private database?: Database;
  private scheduler?: NodeJS.Timer;

  protected async onInitialize(): Promise<void> {
    // Initialize resources
    this.database = await connectToDatabase();
    this.scheduler = setInterval(this.cleanup.bind(this), 3600000); // 1 hour
    
    this.logger.info('Plugin initialized with database connection');
  }

  async shutdown(): Promise<void> {
    // Clean up resources
    if (this.scheduler) {
      clearInterval(this.scheduler);
    }
    
    if (this.database) {
      await this.database.close();
    }
    
    this.logger.info('Plugin shutdown complete');
  }

  private async cleanup(): void {
    // Periodic cleanup tasks
    await this.database?.query('DELETE FROM temp_data WHERE created < ?', [
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    ]);
  }
}
```

### Plugin Configuration

Plugins can accept configuration during registration:

```typescript
export interface WeatherPluginConfig {
  apiKey: string;
  defaultUnits: 'metric' | 'imperial';
  cacheTimeout: number;
}

export class WeatherPlugin extends BasePlugin {
  private config: WeatherPluginConfig;

  constructor(config: WeatherPluginConfig) {
    super();
    this.config = config;
  }

  protected async onInitialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('Weather API key is required');
    }
    
    this.logger.info(`Weather plugin initialized with ${this.config.defaultUnits} units`);
  }
}

// Usage
await server.registerPlugin(new WeatherPlugin({
  apiKey: process.env.WEATHER_API_KEY!,
  defaultUnits: 'metric',
  cacheTimeout: 300000 // 5 minutes
}));
```

## Tool Development Best Practices

### Input Validation

Always validate tool inputs thoroughly:

```typescript
this.createTool(
  'create_user',
  'Create a new user account',
  {
    email: {
      type: 'string',
      format: 'email',
      description: 'User email address'
    },
    age: {
      type: 'number',
      minimum: 13,
      maximum: 120,
      description: 'User age'
    },
    preferences: {
      type: 'object',
      properties: {
        theme: { type: 'string', enum: ['light', 'dark'] },
        notifications: { type: 'boolean' }
      },
      additionalProperties: false
    }
  },
  ['email', 'age'],
  async (params, context) => {
    // Additional validation
    if (!this.isValidEmail(params.email)) {
      throw new Error('Invalid email format');
    }

    if (await this.userExists(params.email)) {
      throw new Error('User already exists');
    }

    // Tool logic here
    const user = await this.createUser(params);
    
    return {
      content: [{
        type: 'text',
        text: `User created successfully: ${user.id}`
      }]
    };
  }
)
```

### Error Handling Patterns

Implement comprehensive error handling:

```typescript
private async handleApiCall(params: any, context: PluginContext): Promise<any> {
  try {
    // Validate input
    this.validateInput(params);
    
    // Make API call with timeout
    const response = await Promise.race([
      fetch(this.buildApiUrl(params), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params)
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      )
    ]) as Response;

    if (!response.ok) {
      // Handle different HTTP status codes
      switch (response.status) {
        case 401:
          throw new Error('API key is invalid or expired');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later.');
        case 500:
          throw new Error('External service is temporarily unavailable');
        default:
          throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    return this.formatResponse(data);

  } catch (error) {
    context.logger.error('API call failed:', error);
    
    // Determine if error is user-facing or internal
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('Rate limit')) {
        // User-facing error
        throw error;
      }
    }
    
    // Internal error - don't expose details
    throw new Error('Service temporarily unavailable');
  }
}
```

### Response Formatting

Provide rich, structured responses:

```typescript
private formatWeatherResponse(data: WeatherData): ToolResponse {
  const { location, temperature, condition, humidity, windSpeed } = data;
  
  return {
    content: [
      {
        type: 'text',
        text: `**Current Weather for ${location}**\n\n` +
              `🌡️ **Temperature:** ${temperature}°C\n` +
              `☁️ **Condition:** ${condition}\n` +
              `💧 **Humidity:** ${humidity}%\n` +
              `💨 **Wind Speed:** ${windSpeed} m/s\n\n` +
              `*Last updated: ${new Date().toLocaleString()}*`
      }
    ]
  };
}

// For structured data that might be processed programmatically
private formatDataResponse(data: any): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: `## Results\n\n${this.formatAsMarkdownTable(data)}`
      },
      {
        type: 'resource',
        data: JSON.stringify(data),
        mimeType: 'application/json'
      }
    ]
  };
}
```

## State Management

### Plugin State

Manage plugin-level state for caching and configuration:

```typescript
export class CachePlugin extends BasePlugin {
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes

  protected async onInitialize(): Promise<void> {
    // Start cache cleanup interval
    setInterval(this.cleanupCache.bind(this), 60000); // Every minute
  }

  private async cacheGet(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private async cacheSet(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}
```

### Session State

Use workflow state for user session management:

```typescript
private async handleUserPreference(params: any, context: PluginContext): Promise<any> {
  // Get current user preferences
  const currentState = context.getWorkflowState() || {};
  const userPrefs = currentState.preferences || {};

  // Update preferences
  userPrefs[params.key] = params.value;
  
  // Save back to workflow state
  context.setWorkflowState({
    ...currentState,
    preferences: userPrefs,
    lastUpdated: new Date().toISOString()
  });

  return {
    content: [{
      type: 'text',
      text: `Preference ${params.key} updated to: ${params.value}`
    }]
  };
}
```

## Resource Management

### Static Resources

Provide static documentation or templates:

```typescript
protected defineResources(): MCPResourceDefinition[] {
  return [
    this.createResource(
      'plugin://templates/user-guide',
      'User Guide Template',
      'Template for creating user guides',
      async (context) => {
        const template = await fs.readFile('./templates/user-guide.md', 'utf-8');
        return {
          contents: [{
            uri: 'plugin://templates/user-guide',
            mimeType: 'text/markdown',
            text: template
          }]
        };
      },
      'text/markdown'
    )
  ];
}
```

### Dynamic Resources

Generate resources based on current state:

```typescript
this.createResource(
  'plugin://data/current-session',
  'Current Session Data',
  'Current user session and preferences',
  async (context) => {
    const sessionData = context.getWorkflowState() || {};
    const userContext = context.getRequestContext();
    
    const data = {
      session: {
        id: userContext?.sessionId,
        user: userContext?.userId,
        created: sessionData.created || new Date().toISOString()
      },
      preferences: sessionData.preferences || {},
      statistics: {
        toolsUsed: sessionData.toolsUsed || 0,
        lastActivity: sessionData.lastActivity
      }
    };

    return {
      contents: [{
        uri: 'plugin://data/current-session',
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2)
      }]
    };
  },
  'application/json'
)
```

## Testing Strategies

### Unit Testing

Test individual plugin methods:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherPlugin } from './weather-plugin';
import { PluginContext } from '@mcp/types';

describe('WeatherPlugin', () => {
  let plugin: WeatherPlugin;
  let mockContext: PluginContext;
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    plugin = new WeatherPlugin({ apiKey: 'test-key' });
    mockContext = {
      pluginId: 'weather',
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      },
      registerTool: vi.fn(),
      registerResource: vi.fn(),
      registerPrompt: vi.fn(),
      getRequestContext: vi.fn(),
      getWorkflowState: vi.fn(),
      setWorkflowState: vi.fn()
    };
  });

  it('should handle successful weather request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        main: { temp: 22, humidity: 65 },
        weather: [{ description: 'sunny' }],
        wind: { speed: 3.5 }
      })
    });

    const tools = plugin.defineTools();
    const weatherTool = tools.find(t => t.name.includes('get_current_weather'));
    
    const result = await weatherTool!.handler(
      { location: 'San Francisco', units: 'metric' },
      mockContext
    );

    expect(result.content[0].text).toContain('22°C');
    expect(result.content[0].text).toContain('sunny');
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const tools = plugin.defineTools();
    const weatherTool = tools.find(t => t.name.includes('get_current_weather'));
    
    await expect(
      weatherTool!.handler({ location: 'InvalidCity' }, mockContext)
    ).rejects.toThrow('Weather API error');
  });
});
```

### Integration Testing

Test plugin integration with server:

```typescript
import { MCPServer } from '@mcp/server-core';
import { WeatherPlugin } from './weather-plugin';

describe('Weather Plugin Integration', () => {
  let server: MCPServer;

  beforeEach(async () => {
    server = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      transport: { type: 'stdio' },
      logLevel: 'error' // Reduce noise in tests
    });

    await server.registerPlugin(new WeatherPlugin({ apiKey: 'test-key' }));
  });

  afterEach(async () => {
    await server.shutdown();
  });

  it('should register tools correctly', () => {
    const plugins = server.getLoadedPlugins();
    expect(plugins).toContain('weather');
  });
});
```

## Performance Optimization

### Caching Strategies

Implement intelligent caching:

```typescript
class SmartCache {
  private cache = new Map<string, CacheEntry>();
  
  constructor(private defaultTTL = 300000) {} // 5 minutes

  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const entry = this.cache.get(key);
    
    if (entry && Date.now() < entry.expires) {
      return entry.data;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  private set(key: string, data: any, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    });
  }
}
```

### Connection Pooling

Reuse connections for external services:

```typescript
class ApiClient {
  private agent: https.Agent;

  constructor() {
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 10,
      timeout: 10000
    });
  }

  async request(url: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
      ...options,
      // @ts-ignore
      agent: this.agent
    });
  }

  destroy(): void {
    this.agent.destroy();
  }
}
```

### Batch Operations

Group multiple operations when possible:

```typescript
this.createTool(
  'batch_weather',
  'Get weather for multiple locations',
  {
    locations: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 10,
      description: 'List of locations (max 10)'
    }
  },
  ['locations'],
  async (params, context) => {
    // Process locations in parallel
    const weatherPromises = params.locations.map(location =>
      this.getWeatherForLocation(location).catch(error => ({
        location,
        error: error.message
      }))
    );

    const results = await Promise.all(weatherPromises);
    
    return {
      content: [{
        type: 'text',
        text: this.formatBatchResults(results)
      }]
    };
  }
)
```

## Security Best Practices

### Input Sanitization

Always sanitize user inputs:

```typescript
private sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim()
    .substring(0, 1000); // Limit length
}

private validateFilePath(path: string): boolean {
  // Prevent directory traversal
  const normalizedPath = path.normalize(path);
  return !normalizedPath.includes('..') && 
         normalizedPath.startsWith('/allowed/directory/');
}
```

### API Key Management

Handle API keys securely:

```typescript
export class SecurePlugin extends BasePlugin {
  private apiKey: string;

  constructor(config: { apiKey: string }) {
    super();
    
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    
    // Store API key securely (consider encryption for persistent storage)
    this.apiKey = config.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'MCP-Plugin/1.0.0',
      'Content-Type': 'application/json'
    };
  }

  async shutdown(): Promise<void> {
    // Clear sensitive data
    this.apiKey = '';
  }
}
```

### Rate Limiting

Implement client-side rate limiting:

```typescript
class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`);
    }
    
    this.requests.push(now);
  }
}
```

## Deployment Considerations

### Environment Configuration

Use environment variables for configuration:

```typescript
export class ProductionPlugin extends BasePlugin {
  private config: PluginConfig;

  constructor() {
    super();
    this.config = {
      apiKey: process.env.API_KEY!,
      endpoint: process.env.API_ENDPOINT || 'https://api.example.com',
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '10000'),
      retries: parseInt(process.env.MAX_RETRIES || '3'),
      logLevel: (process.env.LOG_LEVEL as LogLevel) || 'info'
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    const required = ['apiKey'];
    for (const key of required) {
      if (!this.config[key as keyof PluginConfig]) {
        throw new Error(`Missing required configuration: ${key}`);
      }
    }
  }
}
```

### Health Checks

Implement health check endpoints:

```typescript
protected defineTools(): MCPToolDefinition[] {
  return [
    // ... other tools
    
    this.createTool(
      'health_check',
      'Check plugin health and connectivity',
      {},
      [],
      async (params, context) => {
        const checks = await Promise.allSettled([
          this.checkApiConnectivity(),
          this.checkDatabaseConnection(),
          this.checkCacheStatus()
        ]);

        const results = checks.map((check, index) => {
          const names = ['API', 'Database', 'Cache'];
          return {
            service: names[index],
            status: check.status === 'fulfilled' ? 'healthy' : 'unhealthy',
            error: check.status === 'rejected' ? check.reason.message : null
          };
        });

        const allHealthy = results.every(r => r.status === 'healthy');

        return {
          content: [{
            type: 'text',
            text: `**Plugin Health Check**\n\n` +
                  results.map(r => 
                    `${r.service}: ${r.status === 'healthy' ? '✅' : '❌'} ${r.status}` +
                    (r.error ? ` (${r.error})` : '')
                  ).join('\n') +
                  `\n\n**Overall Status:** ${allHealthy ? '✅ Healthy' : '❌ Degraded'}`
          }]
        };
      }
    )
  ];
}
```

This comprehensive guide covers the essential patterns and best practices for developing robust, production-ready MCP plugins.