import { PluginContext } from './mcp';

/**
 * Plugin system type definitions
 */

export interface MCPPlugin {
  metadata: PluginMetadata;
  initialize(this: PluginContext): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
  keywords?: string[];
  category?: string;
  homepage?: string;
  dependencies?: string[];
}

export interface WorkflowPluginMetadata extends PluginMetadata {
  triggers: string[];
  tools: string[];
  contextRequirements: string[];
  capabilities?: string[];
  exitSignals?: string[];
}

export interface PluginConfig {
  enabled?: boolean;
  config?: Record<string, any>;
  priority?: number;
}

export interface PluginRegistry {
  register(plugin: MCPPlugin, config?: PluginConfig): Promise<void>;
  unregister(pluginId: string): Promise<void>;
  get(pluginId: string): MCPPlugin | undefined;
  getAll(): MCPPlugin[];
  isRegistered(pluginId: string): boolean;
}