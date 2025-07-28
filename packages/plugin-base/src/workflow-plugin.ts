import { WorkflowPluginMetadata, PluginContext } from '@mcp/types';
import { BasePlugin } from './base-plugin';

export abstract class WorkflowPlugin extends BasePlugin {
  abstract metadata: WorkflowPluginMetadata;

  // Workflow-specific methods
  abstract getSystemPrompt(context?: any): string;
  abstract onWorkflowEnter?(context: any): Promise<void>;
  abstract onWorkflowExit?(context: any): Promise<void>;
  
  // State management helpers
  protected async getWorkflowState<T = any>(context: PluginContext): Promise<T | undefined> {
    return context.getWorkflowState<T>();
  }

  protected async updateWorkflowState<T = any>(context: PluginContext, state: T): Promise<void> {
    await context.updateWorkflowState(state);
  }

  protected async initializeWorkflowState<T = any>(context: PluginContext, initialState: T): Promise<T> {
    const existingState = await this.getWorkflowState<T>(context);
    if (!existingState) {
      await this.updateWorkflowState(context, initialState);
      return initialState;
    }
    return existingState;
  }

  // Progress tracking helpers
  protected async updateProgress(context: PluginContext, step: string, percentage: number): Promise<void> {
    const state = await this.getWorkflowState(context) || {};
    const updatedState = {
      ...state,
      currentStep: step,
      progress: percentage,
      lastUpdated: new Date().toISOString()
    };
    await this.updateWorkflowState(context, updatedState);
  }

  protected async addCheckpoint(context: PluginContext, description: string, data?: any): Promise<void> {
    const state = await this.getWorkflowState(context) || {};
    const checkpoint = {
      id: `checkpoint_${Date.now()}`,
      timestamp: new Date().toISOString(),
      description,
      data: data || {}
    };
    
    const checkpoints = state.checkpoints || [];
    checkpoints.push(checkpoint);
    
    const updatedState = {
      ...state,
      checkpoints,
      lastCheckpoint: checkpoint
    };
    
    await this.updateWorkflowState(context, updatedState);
  }

  // Context validation helpers
  protected validateRequiredContext(context: any, required: string[]): void {
    for (const key of required) {
      if (!(key in context)) {
        throw new Error(`Required context missing: ${key}`);
      }
    }
  }

  // Intent detection helpers
  protected matchesTrigger(message: string, triggers: string[]): boolean {
    const lowerMessage = message.toLowerCase();
    return triggers.some(trigger => 
      lowerMessage.includes(trigger.toLowerCase())
    );
  }

  protected matchesExitSignal(message: string, exitSignals: string[]): boolean {
    const lowerMessage = message.toLowerCase();
    return exitSignals.some(signal => 
      lowerMessage.includes(signal.toLowerCase())
    );
  }

  // Tool creation with workflow context
  protected createWorkflowTool(
    name: string,
    description: string,
    properties: Record<string, any>,
    required: string[],
    handler: (params: any, context: PluginContext) => Promise<any>
  ) {
    return this.createTool(name, description, properties, required, async (params, context) => {
      // Ensure workflow state exists
      await this.initializeWorkflowState(context, {
        workflowId: this.metadata.id,
        startedAt: new Date().toISOString(),
        currentStep: name,
        data: {}
      });

      return await handler(params, context);
    });
  }
}