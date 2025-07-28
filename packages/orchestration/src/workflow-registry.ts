import { WorkflowDefinition } from '@mcp/types';

export class WorkflowRegistry {
  private workflows: Map<string, WorkflowDefinition> = new Map();

  register(definition: WorkflowDefinition): void {
    this.workflows.set(definition.id, definition);
  }

  get(id: string): WorkflowDefinition | undefined {
    return this.workflows.get(id);
  }

  getAll(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  findByTrigger(trigger: string): WorkflowDefinition[] {
    const lowerTrigger = trigger.toLowerCase();
    return this.getAll().filter(workflow =>
      workflow.triggers.some(t => t.toLowerCase().includes(lowerTrigger))
    );
  }

  findByCategory(category: string): WorkflowDefinition[] {
    return this.getAll().filter(workflow => workflow.category === category);
  }

  unregister(id: string): boolean {
    return this.workflows.delete(id);
  }

  clear(): void {
    this.workflows.clear();
  }

  has(id: string): boolean {
    return this.workflows.has(id);
  }

  size(): number {
    return this.workflows.size;
  }
}