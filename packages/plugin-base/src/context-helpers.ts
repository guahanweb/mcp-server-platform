import { PluginContext, UserRequestContext } from '@mcp/types';

/**
 * Helper functions for working with plugin context
 */

export class ContextHelper {
  constructor(private context: PluginContext) {}

  // Request context helpers
  getSessionId(): string | undefined {
    return this.context.getRequestContext()?.sessionId;
  }

  getUserId(): string | undefined {
    return this.context.getRequestContext()?.userId;
  }

  getCurrentWorkflow(): string | undefined {
    return this.context.getRequestContext()?.currentWorkflow;
  }

  getMessage(): string | undefined {
    return this.context.getRequestContext()?.message;
  }

  getMetadata(): Record<string, any> | undefined {
    return this.context.getRequestContext()?.metadata;
  }

  // State management helpers
  async getState<T = any>(): Promise<T | undefined> {
    return this.context.getWorkflowState<T>();
  }

  async updateState<T = any>(state: T): Promise<void> {
    await this.context.updateWorkflowState(state);
  }

  async mergeState(updates: Record<string, any>): Promise<void> {
    const currentState = await this.getState() || {};
    const newState = { ...currentState, ...updates };
    await this.updateState(newState);
  }

  async getStateProperty<T = any>(key: string): Promise<T | undefined> {
    const state = await this.getState();
    return state ? state[key] : undefined;
  }

  async setStateProperty<T = any>(key: string, value: T): Promise<void> {
    await this.mergeState({ [key]: value });
  }

  // Configuration helpers
  getConfig(): Record<string, any> {
    return this.context.config;
  }

  getConfigValue<T = any>(key: string, defaultValue?: T): T {
    return this.context.config[key] ?? defaultValue;
  }

  // Logging helpers
  debug(message: string, ...args: any[]): void {
    this.context.logger.debug(message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.context.logger.info(message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.context.logger.warn(message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.context.logger.error(message, ...args);
  }

  // Validation helpers
  requireSessionId(): string {
    const sessionId = this.getSessionId();
    if (!sessionId) {
      throw new Error('Session ID is required but not provided');
    }
    return sessionId;
  }

  requireUserId(): string {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('User ID is required but not provided');
    }
    return userId;
  }

  requireWorkflow(): string {
    const workflow = this.getCurrentWorkflow();
    if (!workflow) {
      throw new Error('Current workflow is required but not set');
    }
    return workflow;
  }

  requireState<T = any>(): T {
    const state = this.context.getWorkflowState<T>();
    if (!state) {
      throw new Error('Workflow state is required but not available');
    }
    return state;
  }
}

/**
 * Create a context helper instance
 */
export function createContextHelper(context: PluginContext): ContextHelper {
  return new ContextHelper(context);
}

/**
 * State management utilities
 */
export const StateUtils = {
  // Initialize state if it doesn't exist
  async initializeState<T>(context: PluginContext, initialState: T): Promise<T> {
    const existingState = context.getWorkflowState<T>();
    if (!existingState) {
      await context.updateWorkflowState(initialState);
      return initialState;
    }
    return existingState;
  },

  // Update nested property in state
  async updateNestedProperty(
    context: PluginContext,
    path: string,
    value: any
  ): Promise<void> {
    const state = context.getWorkflowState() || {};
    const keys = path.split('.');
    let current = state;

    // Navigate to the parent of the target property
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    // Set the target property
    current[keys[keys.length - 1]] = value;
    await context.updateWorkflowState(state);
  },

  // Get nested property from state
  getNestedProperty<T = any>(state: any, path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let current = state;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue as T;
      }
    }

    return current as T;
  },

  // Add item to array in state
  async addToArray(
    context: PluginContext,
    arrayPath: string,
    item: any
  ): Promise<void> {
    const state = context.getWorkflowState() || {};
    const currentArray = StateUtils.getNestedProperty(state, arrayPath, []);
    const newArray = [...currentArray, item];
    await StateUtils.updateNestedProperty(context, arrayPath, newArray);
  },

  // Remove item from array in state
  async removeFromArray(
    context: PluginContext,
    arrayPath: string,
    predicate: (item: any) => boolean
  ): Promise<void> {
    const state = context.getWorkflowState() || {};
    const currentArray = StateUtils.getNestedProperty(state, arrayPath, []);
    const newArray = currentArray.filter((item: any) => !predicate(item));
    await StateUtils.updateNestedProperty(context, arrayPath, newArray);
  }
};

/**
 * Request context utilities
 */
export const RequestUtils = {
  // Extract information from user message
  extractEmail(message: string): string | null {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = message.match(emailRegex);
    return match ? match[0] : null;
  },

  extractUrl(message: string): string | null {
    const urlRegex = /https?:\/\/[^\s]+/;
    const match = message.match(urlRegex);
    return match ? match[0] : null;
  },

  extractNumber(message: string): number | null {
    const numberRegex = /\b\d+(?:\.\d+)?\b/;
    const match = message.match(numberRegex);
    return match ? parseFloat(match[0]) : null;
  },

  // Check if message contains specific patterns
  containsQuestion(message: string): boolean {
    return message.includes('?') || 
           message.toLowerCase().startsWith('what') ||
           message.toLowerCase().startsWith('how') ||
           message.toLowerCase().startsWith('why') ||
           message.toLowerCase().startsWith('when') ||
           message.toLowerCase().startsWith('where') ||
           message.toLowerCase().startsWith('who');
  },

  containsNegation(message: string): boolean {
    const negationWords = ['no', 'not', 'never', 'none', 'nothing', 'nobody', 'nowhere'];
    const lowerMessage = message.toLowerCase();
    return negationWords.some(word => lowerMessage.includes(word));
  },

  containsUrgency(message: string): boolean {
    const urgencyWords = ['urgent', 'asap', 'immediately', 'quickly', 'rush', 'emergency'];
    const lowerMessage = message.toLowerCase();
    return urgencyWords.some(word => lowerMessage.includes(word));
  }
};