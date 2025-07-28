import { IntentAnalysis, IntentDetector, UserSession } from '@mcp/types';
import { WorkflowRegistry } from './workflow-registry';

export class RuleBasedIntentDetector implements IntentDetector {
  private registry: WorkflowRegistry;

  constructor(registry: WorkflowRegistry) {
    this.registry = registry;
  }

  async analyzeMessage(message: string, session: UserSession): Promise<IntentAnalysis> {
    const lowerMessage = message.toLowerCase();
    
    // Check for exit signals first
    const exitSignals = ['done', 'finished', 'complete', 'exit', 'stop', 'end session', 'quit'];
    const shouldExit = exitSignals.some(signal => lowerMessage.includes(signal));
    
    if (shouldExit && session.activeWorkflow) {
      return {
        confidence: 0.9,
        intents: [{
          name: 'exit_workflow',
          confidence: 0.9
        }],
        entities: [],
        shouldSwitchWorkflow: true,
        targetWorkflow: undefined, // Exit to general context
        extractedData: { reason: 'user_requested' }
      };
    }

    // Find matching workflows by triggers
    const matchingWorkflows = this.registry.getAll().filter(workflow =>
      workflow.triggers.some(trigger => lowerMessage.includes(trigger.toLowerCase()))
    );

    if (matchingWorkflows.length > 0) {
      const bestMatch = matchingWorkflows[0]; // Simple: take first match
      const confidence = this.calculateConfidence(message, bestMatch.triggers);
      
      return {
        confidence,
        intents: [{
          name: 'switch_workflow',
          confidence,
          parameters: { targetWorkflow: bestMatch.id }
        }],
        entities: this.extractEntities(message),
        shouldSwitchWorkflow: confidence > 0.7,
        targetWorkflow: bestMatch.id,
        extractedData: this.extractWorkflowData(message, bestMatch)
      };
    }

    // No workflow switch needed
    return {
      confidence: 0.1,
      intents: [{
        name: 'continue_current',
        confidence: 0.1
      }],
      entities: this.extractEntities(message),
      shouldSwitchWorkflow: false
    };
  }

  private calculateConfidence(message: string, triggers: string[]): number {
    const lowerMessage = message.toLowerCase();
    let maxConfidence = 0;

    for (const trigger of triggers) {
      const lowerTrigger = trigger.toLowerCase();
      
      if (lowerMessage === lowerTrigger) {
        maxConfidence = Math.max(maxConfidence, 1.0);
      } else if (lowerMessage.includes(lowerTrigger)) {
        const ratio = lowerTrigger.length / lowerMessage.length;
        maxConfidence = Math.max(maxConfidence, ratio * 0.8);
      } else if (this.fuzzyMatch(lowerMessage, lowerTrigger)) {
        maxConfidence = Math.max(maxConfidence, 0.6);
      }
    }

    return maxConfidence;
  }

  private fuzzyMatch(text: string, pattern: string): boolean {
    const words = pattern.split(' ');
    return words.every(word => text.includes(word));
  }

  private extractEntities(message: string) {
    const entities = [];
    
    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = message.match(emailRegex);
    if (emails) {
      entities.push(...emails.map(email => ({
        type: 'email',
        value: email,
        confidence: 1.0
      })));
    }

    // Extract numbers
    const numberRegex = /\b\d+(?:\.\d+)?\b/g;
    const numbers = message.match(numberRegex);
    if (numbers) {
      entities.push(...numbers.map(num => ({
        type: 'number',
        value: num,
        confidence: 1.0
      })));
    }

    // Extract URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = message.match(urlRegex);
    if (urls) {
      entities.push(...urls.map(url => ({
        type: 'url',
        value: url,
        confidence: 1.0
      })));
    }

    return entities;
  }

  private extractWorkflowData(message: string, workflow: any): Record<string, any> {
    const data: Record<string, any> = {
      originalMessage: message,
      workflowId: workflow.id,
      timestamp: new Date().toISOString()
    };

    // Extract basic context based on workflow type
    if (workflow.id.includes('character')) {
      const nameMatch = message.match(/(?:character|person|character named|called)\s+([A-Z][a-z]+)/i);
      if (nameMatch) {
        data.characterName = nameMatch[1];
      }
    }

    if (workflow.id.includes('story')) {
      const genreMatch = message.match(/(?:story|tale|novel|book)\s+(?:about|involving|featuring)\s+([^.!?]+)/i);
      if (genreMatch) {
        data.storyTopic = genreMatch[1].trim();
      }
    }

    return data;
  }
}