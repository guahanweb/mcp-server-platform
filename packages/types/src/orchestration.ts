/**
 * Orchestration layer type definitions
 */

export interface UserSession {
  sessionId: string;
  userId: string;
  userName: string;
  activeWorkflow?: string;
  currentContext: string;
  globalContext: GlobalContext;
  workflowContext?: WorkflowContext;
  conversationHistory: ConversationEntry[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface GlobalContext {
  userId: string;
  userName: string;
  preferences?: UserPreferences;
  activeProjects?: string[];
  recentWorkflows?: string[];
}

export interface UserPreferences {
  theme?: string;
  language?: string;
  timezone?: string;
  communicationStyle?: string;
  customSettings?: Record<string, any>;
}

export interface WorkflowContext {
  workflowId: string;
  state: WorkflowState;
  hydratedData: Record<string, any>;
  tools: string[];
  history: WorkflowHistoryEntry[];
  checkpoints: WorkflowCheckpoint[];
}

export interface WorkflowState {
  workflowId: string;
  currentStep: string;
  data: Record<string, any>;
  metadata: WorkflowMetadata;
  checkpoints: WorkflowCheckpoint[];
}

export interface WorkflowMetadata {
  startedAt: Date;
  lastModified: Date;
  completionPercentage: number;
  isDraft: boolean;
  tags?: string[];
}

export interface WorkflowCheckpoint {
  id: string;
  timestamp: Date;
  step: string;
  description?: string;
  data: Record<string, any>;
}

export interface WorkflowHistoryEntry {
  timestamp: Date;
  action: string;
  details: Record<string, any>;
}

export interface ConversationEntry {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    workflowId?: string;
    toolCalls?: any[];
    intentAnalysis?: IntentAnalysis;
  };
}

export interface IntentAnalysis {
  confidence: number;
  intents: Intent[];
  entities: ExtractedEntity[];
  shouldSwitchWorkflow: boolean;
  targetWorkflow?: string;
  extractedData?: Record<string, any>;
}

export interface Intent {
  name: string;
  confidence: number;
  parameters?: Record<string, any>;
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  capabilities: string[];
  requiredContext: string[];
  optionalContext?: string[];
  exitSignals?: string[];
  category?: string;
  tags?: string[];
}

export interface OrchestrationConfig {
  sessionStore?: SessionStore;
  intentDetector?: IntentDetector;
  contextLoader?: ContextLoader;
  defaultWorkflow?: string;
  sessionTimeout?: number;
}

export interface SessionStore {
  get(sessionId: string): Promise<UserSession | null>;
  set(session: UserSession): Promise<void>;
  delete(sessionId: string): Promise<void>;
  exists(sessionId: string): Promise<boolean>;
  cleanup?(olderThan: Date): Promise<number>;
}

export interface IntentDetector {
  analyzeMessage(message: string, session: UserSession): Promise<IntentAnalysis>;
}

export interface ContextLoader {
  loadContext(workflowId: string, sessionId: string, entities?: string[]): Promise<WorkflowContext>;
  hydrateContext(context: WorkflowContext, entities: string[]): Promise<WorkflowContext>;
}