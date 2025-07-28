import { UserSession, WorkflowContext, ContextLoader } from '@mcp/types';
import { WorkflowRegistry } from './workflow-registry';

export class ContextManager {
  private registry: WorkflowRegistry;
  private loaders: Map<string, ContextLoader> = new Map();

  constructor(registry: WorkflowRegistry) {
    this.registry = registry;
  }

  registerLoader(workflowId: string, loader: ContextLoader): void {
    this.loaders.set(workflowId, loader);
  }

  async switchContext(
    session: UserSession,
    targetWorkflow: string | undefined,
    initData?: any
  ): Promise<UserSession> {
    if (!targetWorkflow) {
      // Switch to general context
      session.activeWorkflow = undefined;
      session.workflowContext = undefined;
      session.currentContext = 'general';
      return session;
    }

    const workflow = this.registry.get(targetWorkflow);
    if (!workflow) {
      throw new Error(`Workflow not found: ${targetWorkflow}`);
    }

    // Load workflow context
    const loader = this.loaders.get(targetWorkflow);
    if (loader) {
      session.workflowContext = await loader.loadContext(targetWorkflow, session.sessionId);
    } else {
      // Create basic context
      session.workflowContext = {
        workflowId: targetWorkflow,
        state: {
          workflowId: targetWorkflow,
          currentStep: 'initial',
          data: initData || {},
          metadata: {
            startedAt: new Date(),
            lastModified: new Date(),
            completionPercentage: 0,
            isDraft: true
          },
          checkpoints: []
        },
        hydratedData: {},
        tools: workflow.capabilities || [],
        history: [],
        checkpoints: []
      };
    }

    session.activeWorkflow = targetWorkflow;
    session.currentContext = targetWorkflow;

    // Update recent workflows
    if (!session.globalContext.recentWorkflows) {
      session.globalContext.recentWorkflows = [];
    }
    
    const recent = session.globalContext.recentWorkflows;
    const index = recent.indexOf(targetWorkflow);
    if (index > -1) {
      recent.splice(index, 1);
    }
    recent.unshift(targetWorkflow);
    
    // Keep only last 10
    if (recent.length > 10) {
      recent.splice(10);
    }

    return session;
  }

  updateWorkflowProgress(
    session: UserSession,
    step: string,
    percentage: number
  ): UserSession {
    if (session.workflowContext) {
      session.workflowContext.state.currentStep = step;
      session.workflowContext.state.metadata.completionPercentage = percentage;
      session.workflowContext.state.metadata.lastModified = new Date();

      // Add to history
      session.workflowContext.history.push({
        timestamp: new Date(),
        action: 'progress_update',
        details: { step, percentage }
      });
    }

    return session;
  }

  addWorkflowCheckpoint(
    session: UserSession,
    description?: string,
    data?: any
  ): UserSession {
    if (session.workflowContext) {
      const checkpoint = {
        id: `checkpoint_${Date.now()}`,
        timestamp: new Date(),
        step: session.workflowContext.state.currentStep,
        description: description || `Checkpoint at ${session.workflowContext.state.currentStep}`,
        data: data || {}
      };

      session.workflowContext.state.checkpoints.push(checkpoint);
      session.workflowContext.checkpoints.push(checkpoint);

      // Add to history
      session.workflowContext.history.push({
        timestamp: new Date(),
        action: 'checkpoint_added',
        details: { checkpointId: checkpoint.id, description }
      });
    }

    return session;
  }
}