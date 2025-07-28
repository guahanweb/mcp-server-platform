import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowRegistry } from './workflow-registry';
import { WorkflowDefinition } from '@mcp/types';

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry;
  
  const sampleWorkflow: WorkflowDefinition = {
    id: 'test-workflow',
    name: 'Test Workflow',
    description: 'A test workflow',
    triggers: ['test', 'example'],
    capabilities: ['test-capability'],
    requiredContext: [],
    category: 'testing'
  };

  beforeEach(() => {
    registry = new WorkflowRegistry();
  });

  it('should register and retrieve workflows', () => {
    registry.register(sampleWorkflow);
    
    expect(registry.has('test-workflow')).toBe(true);
    expect(registry.get('test-workflow')).toEqual(sampleWorkflow);
    expect(registry.size()).toBe(1);
  });

  it('should find workflows by trigger', () => {
    registry.register(sampleWorkflow);
    
    const matches = registry.findByTrigger('test');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(sampleWorkflow);
  });

  it('should find workflows by category', () => {
    registry.register(sampleWorkflow);
    
    const matches = registry.findByCategory('testing');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual(sampleWorkflow);
  });

  it('should unregister workflows', () => {
    registry.register(sampleWorkflow);
    expect(registry.has('test-workflow')).toBe(true);
    
    const removed = registry.unregister('test-workflow');
    expect(removed).toBe(true);
    expect(registry.has('test-workflow')).toBe(false);
    expect(registry.size()).toBe(0);
  });

  it('should return all workflows', () => {
    const workflow2 = { ...sampleWorkflow, id: 'workflow-2', name: 'Workflow 2' };
    
    registry.register(sampleWorkflow);
    registry.register(workflow2);
    
    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(sampleWorkflow);
    expect(all).toContain(workflow2);
  });

  it('should clear all workflows', () => {
    registry.register(sampleWorkflow);
    expect(registry.size()).toBe(1);
    
    registry.clear();
    expect(registry.size()).toBe(0);
    expect(registry.getAll()).toHaveLength(0);
  });
});