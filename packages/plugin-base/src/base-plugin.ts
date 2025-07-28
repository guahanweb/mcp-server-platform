import { 
  MCPPlugin, 
  PluginMetadata, 
  PluginContext,
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPPromptDefinition
} from '@mcp/types';

export abstract class BasePlugin implements MCPPlugin {
  abstract metadata: PluginMetadata;

  async initialize(this: PluginContext): Promise<void> {
    // Cast to get access to the concrete plugin instance
    const pluginInstance = (this as any).__plugin_instance__;
    
    // Register all tools defined by the plugin
    const tools = pluginInstance.defineTools();
    for (const tool of tools) {
      this.registerTool(tool);
    }

    // Register any resources
    const resources = pluginInstance.defineResources();
    for (const resource of resources) {
      this.registerResource(resource);
    }

    // Register any prompts
    const prompts = pluginInstance.definePrompts();
    for (const prompt of prompts) {
      this.registerPrompt(prompt);
    }

    // Perform any additional initialization
    await pluginInstance.onInitialize();
  }

  // Override these methods in subclasses
  protected abstract defineTools(): MCPToolDefinition[];
  
  protected defineResources(): MCPResourceDefinition[] {
    return [];
  }

  protected definePrompts(): MCPPromptDefinition[] {
    return [];
  }

  protected async onInitialize(): Promise<void> {
    // Override in subclasses if needed
  }

  async shutdown(): Promise<void> {
    // Override in subclasses if cleanup needed
  }

  // Helper method for consistent tool naming
  protected toolName(name: string): string {
    return `${this.metadata.id}:${name}`;
  }

  // Helper for creating tool definitions with consistent structure
  protected createTool(
    name: string,
    description: string,
    properties: Record<string, any>,
    required: string[],
    handler: (params: any, context: PluginContext) => Promise<any>
  ): MCPToolDefinition {
    return {
      name: name,  // Just the tool name, framework will add prefix
      description,
      inputSchema: {
        type: 'object',
        properties,
        required,
      },
      handler,
    };
  }

  // Helper for creating resource definitions
  protected createResource(
    uri: string,
    name: string,
    description: string,
    handler: (context: PluginContext) => Promise<any>,
    mimeType?: string
  ): MCPResourceDefinition {
    return {
      uri,
      name,
      description,
      mimeType,
      handler,
    };
  }

  // Helper for creating prompt definitions
  protected createPrompt(
    name: string,
    description: string,
    handler: (args: Record<string, any>, context: PluginContext) => Promise<{ messages: any[] }>,
    args?: { name: string; description: string; required?: boolean }[]
  ): MCPPromptDefinition {
    return {
      name: this.toolName(name),
      description,
      arguments: args,
      handler,
    };
  }
}