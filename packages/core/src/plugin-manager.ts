import { 
  MCPPlugin, 
  PluginContext, 
  MCPToolDefinition, 
  MCPResourceDefinition, 
  MCPPromptDefinition,
  Logger,
  UserRequestContext
} from '@mcp/types';

export class PluginManager {
  private plugins: Map<string, MCPPlugin> = new Map();
  private tools: Map<string, MCPToolDefinition> = new Map();
  private resources: Map<string, MCPResourceDefinition> = new Map();
  private prompts: Map<string, MCPPromptDefinition> = new Map();
  private logger: Logger;
  private currentRequestContext: UserRequestContext | null = null;
  private workflowStates: Map<string, any> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async registerPlugin(plugin: MCPPlugin, config?: any): Promise<void> {
    try {
      if (!plugin.metadata || !plugin.metadata.id) {
        throw new Error(`Plugin missing required metadata`);
      }

      if (this.plugins.has(plugin.metadata.id)) {
        throw new Error(`Plugin already registered: ${plugin.metadata.id}`);
      }
      
      // Create plugin context with optional config
      const context = this.createPluginContext(plugin.metadata.id, config);
      
      // Add plugin instance reference to context for base workflow class access
      (context as any).__plugin_instance__ = plugin;
      
      // Initialize plugin with context
      await plugin.initialize.call(context);
      
      this.plugins.set(plugin.metadata.id, plugin);
      this.logger.info(`Registered plugin: ${plugin.metadata.name} v${plugin.metadata.version}`);
    } catch (error) {
      this.logger.error(`Failed to register plugin ${plugin.metadata?.id || 'unknown'}:`, error);
      throw error;
    }
  }

  private createPluginContext(pluginId: string, config?: any): PluginContext {
    return {
      registerTool: (tool: MCPToolDefinition) => {
        const fullName = `${pluginId}:${tool.name}`;
        this.tools.set(fullName, tool);
        this.logger.debug(`Registered tool: ${fullName}`);
      },
      
      registerResource: (resource: MCPResourceDefinition) => {
        this.resources.set(resource.uri, resource);
        this.logger.debug(`Registered resource: ${resource.uri}`);
      },
      
      registerPrompt: (prompt: MCPPromptDefinition) => {
        const fullName = `${pluginId}:${prompt.name}`;
        this.prompts.set(fullName, prompt);
        this.logger.debug(`Registered prompt: ${fullName}`);
      },
      
      logger: this.createPluginLogger(pluginId),
      
      getRequestContext: () => this.currentRequestContext,
      
      getWorkflowState: () => {
        const workflowId = this.currentRequestContext?.currentWorkflow;
        return workflowId ? this.workflowStates.get(workflowId) : undefined;
      },
      
      updateWorkflowState: async (state: any) => {
        const workflowId = this.currentRequestContext?.currentWorkflow;
        if (workflowId) {
          this.workflowStates.set(workflowId, state);
        }
      },
      
      config: config || {},
    };
  }

  private createPluginLogger(pluginName: string): Logger {
    return {
      debug: (message: string, ...args: any[]) => {
        this.logger.debug(`[${pluginName}] ${message}`, ...args);
      },
      info: (message: string, ...args: any[]) => {
        this.logger.info(`[${pluginName}] ${message}`, ...args);
      },
      warn: (message: string, ...args: any[]) => {
        this.logger.warn(`[${pluginName}] ${message}`, ...args);
      },
      error: (message: string, ...args: any[]) => {
        this.logger.error(`[${pluginName}] ${message}`, ...args);
      },
    };
  }

  async shutdownPlugins(): Promise<void> {
    for (const [name, plugin] of this.plugins) {
      try {
        if (plugin.shutdown) {
          await plugin.shutdown();
          this.logger.info(`Shutdown plugin: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to shutdown plugin ${name}:`, error);
      }
    }
    
    this.plugins.clear();
    this.tools.clear();
    this.resources.clear();
    this.prompts.clear();
    this.workflowStates.clear();
  }

  setRequestContext(context: UserRequestContext | null): void {
    this.currentRequestContext = context;
  }

  getCurrentRequestContext(): UserRequestContext | null {
    return this.currentRequestContext;
  }

  getWorkflowState(workflowId: string): any {
    return this.workflowStates.get(workflowId);
  }

  setWorkflowState(workflowId: string, state: any): void {
    this.workflowStates.set(workflowId, state);
  }

  getTool(name: string): MCPToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Map<string, MCPToolDefinition> {
    return new Map(this.tools);
  }

  getResource(uri: string): MCPResourceDefinition | undefined {
    return this.resources.get(uri);
  }

  getAllResources(): Map<string, MCPResourceDefinition> {
    return new Map(this.resources);
  }

  getPrompt(name: string): MCPPromptDefinition | undefined {
    return this.prompts.get(name);
  }

  getAllPrompts(): Map<string, MCPPromptDefinition> {
    return new Map(this.prompts);
  }

  getLoadedPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  getPlugin(id: string): MCPPlugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): MCPPlugin[] {
    return Array.from(this.plugins.values());
  }
}