import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { 
  MCPPlugin,
  PluginContext,
  UserRequestContext,
  Logger,
  TransportConfig,
  ServerTransport
} from '@mcp/types';
import { PluginManager } from './plugin-manager';  
import { createLogger } from './logger';
import { createTransport } from './transports';
import { MCPMiddleware } from './middleware';

export interface MCPServerConfig {
  name: string;
  version: string;
  transport: TransportConfig;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  middleware?: MCPMiddleware[];
  cors?: {
    origin?: string | string[] | boolean;
    credentials?: boolean;
  };
}

export class MCPServer {
  private server: Server;
  private transport: ServerTransport;
  private pluginManager: PluginManager;
  private logger: Logger;
  private config: MCPServerConfig;
  private middleware: MCPMiddleware[];

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.logger = createLogger(config.logLevel || 'info', config.name);
    this.pluginManager = new PluginManager(this.logger);
    this.middleware = config.middleware || [];
    
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.transport = createTransport(config.transport, this.logger);
    this.setupHandlers();
    this.setupTransportHandlers();
  }

  private setupHandlers(): void {
    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.pluginManager.getAllTools().entries()).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.pluginManager.getTool(request.params.name);
      
      if (!tool) {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Tool not found: ${request.params.name}`
        );
      }

      try {
        // Apply middleware
        for (const middleware of this.middleware) {
          if (middleware.beforeToolCall) {
            await middleware.beforeToolCall(request.params.name, request.params.arguments);
          }
        }

        // Create execution context for the tool
        const context = this.createToolExecutionContext();
        const result = await tool.handler(request.params.arguments, context);
        
        // Apply middleware
        for (const middleware of this.middleware) {
          if (middleware.afterToolCall) {
            await middleware.afterToolCall(request.params.name, request.params.arguments, result);
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        this.logger.error(`Tool execution failed: ${request.params.name}`, error);
        
        // Apply middleware
        for (const middleware of this.middleware) {
          if (middleware.onError) {
            await middleware.onError(error as Error, 'tool', request.params.name);
          }
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = Array.from(this.pluginManager.getAllResources().entries()).map(([uri, resource]) => ({
        uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType
      }));

      return { resources };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const resource = this.pluginManager.getResource(request.params.uri);
      
      if (!resource) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Resource not found: ${request.params.uri}`
        );
      }

      try {
        const context = this.createToolExecutionContext();
        const content = await resource.handler(context);
        
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: resource.mimeType || 'text/plain',
              text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
            }
          ]
        };
      } catch (error) {
        this.logger.error(`Resource read failed: ${request.params.uri}`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Resource read failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = Array.from(this.pluginManager.getAllPrompts().entries()).map(([name, prompt]) => ({
        name,
        description: prompt.description,
        arguments: prompt.arguments
      }));

      return { prompts };
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const prompt = this.pluginManager.getPrompt(request.params.name);
      
      if (!prompt) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Prompt not found: ${request.params.name}`
        );
      }

      try {
        const context = this.createToolExecutionContext();
        const result = await prompt.handler(request.params.arguments || {}, context);
        
        return {
          description: prompt.description,
          messages: result.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        };
      } catch (error) {
        this.logger.error(`Prompt generation failed: ${request.params.name}`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Prompt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private setupTransportHandlers(): void {
    this.transport.on('request', async (request: any, respond: (response: any) => void) => {
      try {
        // Set request context
        this.setRequestContext({
          sessionId: request.sessionId || 'anonymous',
          userId: request.userId || 'anonymous',
          currentWorkflow: request.workflowId,
          message: request.message || '',
          timestamp: new Date(),
          metadata: request.metadata
        });

        let response;
        
        switch (request.method) {
          case 'tools/list':
            response = await this.handleToolsList();
            break;
          case 'tools/call':
            response = await this.handleToolCall(request.params);
            break;
          case 'resources/list':
            response = await this.handleResourcesList();
            break;
          case 'resources/read':
            response = await this.handleResourceRead(request.params);
            break;
          case 'prompts/list':
            response = await this.handlePromptsList();
            break;
          case 'prompts/get':
            response = await this.handlePromptGet(request.params);
            break;
          default:
            throw new Error(`Unknown method: ${request.method}`);
        }
        
        respond({
          jsonrpc: '2.0',
          result: response,
          id: request.id
        });
      } catch (error) {
        this.logger.error('Request failed:', error);
        respond({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          id: request.id
        });
      } finally {
        // Clear request context
        this.setRequestContext(null);
      }
    });
  }

  private createToolExecutionContext(): PluginContext {
    return {
      registerTool: () => {
        throw new Error('Cannot register tools during execution');
      },
      registerResource: () => {
        throw new Error('Cannot register resources during execution');
      },
      registerPrompt: () => {
        throw new Error('Cannot register prompts during execution');
      },
      logger: this.logger,
      getRequestContext: () => this.pluginManager.getCurrentRequestContext(),
      getWorkflowState: () => {
        const workflowId = this.pluginManager.getCurrentRequestContext()?.currentWorkflow;
        return workflowId ? this.pluginManager.getWorkflowState(workflowId) : undefined;
      },
      updateWorkflowState: async (state: any) => {
        const workflowId = this.pluginManager.getCurrentRequestContext()?.currentWorkflow;
        if (workflowId) {
          this.pluginManager.setWorkflowState(workflowId, state);
        }
      },
      config: {}
    };
  }

  async registerPlugin(plugin: MCPPlugin, config?: any): Promise<void> {
    await this.pluginManager.registerPlugin(plugin, config);
  }

  getRegisteredPlugins(): string[] {
    return this.pluginManager.getLoadedPluginNames();
  }

  async start(): Promise<void> {
    this.logger.info(`Starting MCP server with ${this.pluginManager.getLoadedPluginNames().length} registered plugins`);

    if (this.config.transport.type === 'stdio') {
      await this.startStdioTransport();
    } else {
      await this.transport.start();
    }
  }

  private async startStdioTransport(): Promise<void> {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    this.logger.info('Starting MCP server with STDIO transport');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('MCP server started successfully on STDIO');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping MCP server...');
    
    await this.pluginManager.shutdownPlugins();
    await this.server.close();
    await this.transport.stop();
    
    this.logger.info('MCP server stopped');
  }

  setRequestContext(context: UserRequestContext | null): void {
    this.pluginManager.setRequestContext(context);
  }

  getServer(): Server {
    return this.server;
  }

  // HTTP/WebSocket handler methods
  private async handleToolsList() {
    const tools = Array.from(this.pluginManager.getAllTools().entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
    return { tools };
  }

  private async handleToolCall(params: any) {
    const tool = this.pluginManager.getTool(params.name);
    
    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Tool not found: ${params.name}`
      );
    }

    const context = this.createToolExecutionContext();
    const result = await tool.handler(params.arguments, context);
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleResourcesList() {
    const resources = Array.from(this.pluginManager.getAllResources().entries()).map(([uri, resource]) => ({
      uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }));
    return { resources };
  }

  private async handleResourceRead(params: any) {
    const resource = this.pluginManager.getResource(params.uri);
    
    if (!resource) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Resource not found: ${params.uri}`
      );
    }

    const context = this.createToolExecutionContext();
    const content = await resource.handler(context);
    return {
      contents: [
        {
          uri: params.uri,
          mimeType: resource.mimeType || 'text/plain',
          text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
        }
      ]
    };
  }

  private async handlePromptsList() {
    const prompts = Array.from(this.pluginManager.getAllPrompts().entries()).map(([name, prompt]) => ({
      name,
      description: prompt.description,
      arguments: prompt.arguments
    }));
    return { prompts };
  }

  private async handlePromptGet(params: any) {
    const prompt = this.pluginManager.getPrompt(params.name);
    
    if (!prompt) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Prompt not found: ${params.name}`
      );
    }

    const context = this.createToolExecutionContext();
    const result = await prompt.handler(params.arguments || {}, context);
    return {
      description: prompt.description,
      messages: result.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };
  }
}