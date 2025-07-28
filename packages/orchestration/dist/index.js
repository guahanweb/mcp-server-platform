"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ContextManager: () => ContextManager,
  InMemorySessionStore: () => InMemorySessionStore,
  Orchestrator: () => Orchestrator,
  RedisSessionStore: () => RedisSessionStore,
  RuleBasedIntentDetector: () => RuleBasedIntentDetector,
  SessionManager: () => SessionManager,
  WorkflowRegistry: () => WorkflowRegistry
});
module.exports = __toCommonJS(index_exports);

// src/session-manager.ts
var SessionManager = class {
  store;
  sessionTimeout;
  constructor(store, sessionTimeout = 30 * 60 * 1e3) {
    this.store = store;
    this.sessionTimeout = sessionTimeout;
  }
  async createSession(userId, userName, sessionId) {
    const session = {
      sessionId: sessionId || this.generateSessionId(),
      userId,
      userName,
      currentContext: "general",
      globalContext: {
        userId,
        userName,
        preferences: {},
        activeProjects: [],
        recentWorkflows: []
      },
      conversationHistory: [],
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    await this.store.set(session);
    return session;
  }
  async getSession(sessionId) {
    return this.store.get(sessionId);
  }
  async getOrCreateSession(sessionId, userId, userName) {
    if (sessionId) {
      const existing = await this.getSession(sessionId);
      if (existing) {
        return existing;
      }
    }
    return this.createSession(userId, userName, sessionId);
  }
  async updateSession(session) {
    session.updatedAt = /* @__PURE__ */ new Date();
    await this.store.set(session);
  }
  async deleteSession(sessionId) {
    const exists = await this.store.exists(sessionId);
    if (exists) {
      await this.store.delete(sessionId);
      return true;
    }
    return false;
  }
  async addMessage(sessionId, message) {
    const session = await this.getSession(sessionId);
    if (session) {
      session.conversationHistory.push(message);
      await this.updateSession(session);
    }
  }
  async getStats() {
    return {
      totalSessions: 0,
      activeSessions: 0,
      averageSessionDuration: 0,
      topWorkflows: []
    };
  }
  async cleanup() {
    const cutoffTime = new Date(Date.now() - this.sessionTimeout);
    if (this.store.cleanup) {
      return this.store.cleanup(cutoffTime);
    }
    return 0;
  }
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// src/context-manager.ts
var ContextManager = class {
  registry;
  loaders = /* @__PURE__ */ new Map();
  constructor(registry) {
    this.registry = registry;
  }
  registerLoader(workflowId, loader) {
    this.loaders.set(workflowId, loader);
  }
  async switchContext(session, targetWorkflow, initData) {
    if (!targetWorkflow) {
      session.activeWorkflow = void 0;
      session.workflowContext = void 0;
      session.currentContext = "general";
      return session;
    }
    const workflow = this.registry.get(targetWorkflow);
    if (!workflow) {
      throw new Error(`Workflow not found: ${targetWorkflow}`);
    }
    const loader = this.loaders.get(targetWorkflow);
    if (loader) {
      session.workflowContext = await loader.loadContext(targetWorkflow, session.sessionId);
    } else {
      session.workflowContext = {
        workflowId: targetWorkflow,
        state: {
          workflowId: targetWorkflow,
          currentStep: "initial",
          data: initData || {},
          metadata: {
            startedAt: /* @__PURE__ */ new Date(),
            lastModified: /* @__PURE__ */ new Date(),
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
    if (!session.globalContext.recentWorkflows) {
      session.globalContext.recentWorkflows = [];
    }
    const recent = session.globalContext.recentWorkflows;
    const index = recent.indexOf(targetWorkflow);
    if (index > -1) {
      recent.splice(index, 1);
    }
    recent.unshift(targetWorkflow);
    if (recent.length > 10) {
      recent.splice(10);
    }
    return session;
  }
  updateWorkflowProgress(session, step, percentage) {
    if (session.workflowContext) {
      session.workflowContext.state.currentStep = step;
      session.workflowContext.state.metadata.completionPercentage = percentage;
      session.workflowContext.state.metadata.lastModified = /* @__PURE__ */ new Date();
      session.workflowContext.history.push({
        timestamp: /* @__PURE__ */ new Date(),
        action: "progress_update",
        details: { step, percentage }
      });
    }
    return session;
  }
  addWorkflowCheckpoint(session, description, data) {
    if (session.workflowContext) {
      const checkpoint = {
        id: `checkpoint_${Date.now()}`,
        timestamp: /* @__PURE__ */ new Date(),
        step: session.workflowContext.state.currentStep,
        description: description || `Checkpoint at ${session.workflowContext.state.currentStep}`,
        data: data || {}
      };
      session.workflowContext.state.checkpoints.push(checkpoint);
      session.workflowContext.checkpoints.push(checkpoint);
      session.workflowContext.history.push({
        timestamp: /* @__PURE__ */ new Date(),
        action: "checkpoint_added",
        details: { checkpointId: checkpoint.id, description }
      });
    }
    return session;
  }
};

// src/workflow-registry.ts
var WorkflowRegistry = class {
  workflows = /* @__PURE__ */ new Map();
  register(definition) {
    this.workflows.set(definition.id, definition);
  }
  get(id) {
    return this.workflows.get(id);
  }
  getAll() {
    return Array.from(this.workflows.values());
  }
  findByTrigger(trigger) {
    const lowerTrigger = trigger.toLowerCase();
    return this.getAll().filter(
      (workflow) => workflow.triggers.some((t) => t.toLowerCase().includes(lowerTrigger))
    );
  }
  findByCategory(category) {
    return this.getAll().filter((workflow) => workflow.category === category);
  }
  unregister(id) {
    return this.workflows.delete(id);
  }
  clear() {
    this.workflows.clear();
  }
  has(id) {
    return this.workflows.has(id);
  }
  size() {
    return this.workflows.size;
  }
};

// src/intent-detector.ts
var RuleBasedIntentDetector = class {
  registry;
  constructor(registry) {
    this.registry = registry;
  }
  async analyzeMessage(message, session) {
    const lowerMessage = message.toLowerCase();
    const exitSignals = ["done", "finished", "complete", "exit", "stop", "end session", "quit"];
    const shouldExit = exitSignals.some((signal) => lowerMessage.includes(signal));
    if (shouldExit && session.activeWorkflow) {
      return {
        confidence: 0.9,
        intents: [{
          name: "exit_workflow",
          confidence: 0.9
        }],
        entities: [],
        shouldSwitchWorkflow: true,
        targetWorkflow: void 0,
        // Exit to general context
        extractedData: { reason: "user_requested" }
      };
    }
    const matchingWorkflows = this.registry.getAll().filter(
      (workflow) => workflow.triggers.some((trigger) => lowerMessage.includes(trigger.toLowerCase()))
    );
    if (matchingWorkflows.length > 0) {
      const bestMatch = matchingWorkflows[0];
      const confidence = this.calculateConfidence(message, bestMatch.triggers);
      return {
        confidence,
        intents: [{
          name: "switch_workflow",
          confidence,
          parameters: { targetWorkflow: bestMatch.id }
        }],
        entities: this.extractEntities(message),
        shouldSwitchWorkflow: confidence > 0.7,
        targetWorkflow: bestMatch.id,
        extractedData: this.extractWorkflowData(message, bestMatch)
      };
    }
    return {
      confidence: 0.1,
      intents: [{
        name: "continue_current",
        confidence: 0.1
      }],
      entities: this.extractEntities(message),
      shouldSwitchWorkflow: false
    };
  }
  calculateConfidence(message, triggers) {
    const lowerMessage = message.toLowerCase();
    let maxConfidence = 0;
    for (const trigger of triggers) {
      const lowerTrigger = trigger.toLowerCase();
      if (lowerMessage === lowerTrigger) {
        maxConfidence = Math.max(maxConfidence, 1);
      } else if (lowerMessage.includes(lowerTrigger)) {
        const ratio = lowerTrigger.length / lowerMessage.length;
        maxConfidence = Math.max(maxConfidence, ratio * 0.8);
      } else if (this.fuzzyMatch(lowerMessage, lowerTrigger)) {
        maxConfidence = Math.max(maxConfidence, 0.6);
      }
    }
    return maxConfidence;
  }
  fuzzyMatch(text, pattern) {
    const words = pattern.split(" ");
    return words.every((word) => text.includes(word));
  }
  extractEntities(message) {
    const entities = [];
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = message.match(emailRegex);
    if (emails) {
      entities.push(...emails.map((email) => ({
        type: "email",
        value: email,
        confidence: 1
      })));
    }
    const numberRegex = /\b\d+(?:\.\d+)?\b/g;
    const numbers = message.match(numberRegex);
    if (numbers) {
      entities.push(...numbers.map((num) => ({
        type: "number",
        value: num,
        confidence: 1
      })));
    }
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = message.match(urlRegex);
    if (urls) {
      entities.push(...urls.map((url) => ({
        type: "url",
        value: url,
        confidence: 1
      })));
    }
    return entities;
  }
  extractWorkflowData(message, workflow) {
    const data = {
      originalMessage: message,
      workflowId: workflow.id,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (workflow.id.includes("character")) {
      const nameMatch = message.match(/(?:character|person|character named|called)\s+([A-Z][a-z]+)/i);
      if (nameMatch) {
        data.characterName = nameMatch[1];
      }
    }
    if (workflow.id.includes("story")) {
      const genreMatch = message.match(/(?:story|tale|novel|book)\s+(?:about|involving|featuring)\s+([^.!?]+)/i);
      if (genreMatch) {
        data.storyTopic = genreMatch[1].trim();
      }
    }
    return data;
  }
};

// src/stores/memory-store.ts
var InMemorySessionStore = class {
  sessions = /* @__PURE__ */ new Map();
  async get(sessionId) {
    return this.sessions.get(sessionId) || null;
  }
  async set(session) {
    this.sessions.set(session.sessionId, { ...session });
  }
  async delete(sessionId) {
    this.sessions.delete(sessionId);
  }
  async exists(sessionId) {
    return this.sessions.has(sessionId);
  }
  async cleanup(olderThan) {
    let cleaned = 0;
    for (const [sessionId, session] of this.sessions) {
      if (session.updatedAt < olderThan) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    return cleaned;
  }
  // Additional methods for testing/debugging
  clear() {
    this.sessions.clear();
  }
  size() {
    return this.sessions.size;
  }
  getAll() {
    return Array.from(this.sessions.values());
  }
};

// src/stores/redis-store.ts
var RedisSessionStore = class {
  config;
  keyPrefix;
  ttl;
  constructor(config = {}) {
    this.config = {
      host: "localhost",
      port: 6379,
      keyPrefix: "mcp:session:",
      ttl: 1800,
      // 30 minutes
      ...config
    };
    this.keyPrefix = this.config.keyPrefix;
    this.ttl = this.config.ttl;
  }
  getKey(sessionId) {
    return `${this.keyPrefix}${sessionId}`;
  }
  async get(sessionId) {
    throw new Error("RedisSessionStore requires Redis client implementation");
  }
  async set(session) {
    throw new Error("RedisSessionStore requires Redis client implementation");
  }
  async delete(sessionId) {
    throw new Error("RedisSessionStore requires Redis client implementation");
  }
  async exists(sessionId) {
    throw new Error("RedisSessionStore requires Redis client implementation");
  }
  async cleanup(olderThan) {
    return 0;
  }
  // Example implementation structure (would need actual Redis client):
  /*
    private redis: Redis;
  
    constructor(config: RedisConfig = {}) {
      this.config = { ... };
      this.redis = new Redis(this.config);
    }
  
    async get(sessionId: string): Promise<UserSession | null> {
      const data = await this.redis.get(this.getKey(sessionId));
      return data ? JSON.parse(data) : null;
    }
  
    async set(session: UserSession): Promise<void> {
      const key = this.getKey(session.sessionId);
      const data = JSON.stringify(session);
      await this.redis.setex(key, this.ttl, data);
    }
  
    async delete(sessionId: string): Promise<void> {
      await this.redis.del(this.getKey(sessionId));
    }
  
    async exists(sessionId: string): Promise<boolean> {
      const result = await this.redis.exists(this.getKey(sessionId));
      return result === 1;
    }
    */
};

// src/orchestrator.ts
var Orchestrator = class {
  sessionManager;
  contextManager;
  workflowRegistry;
  intentDetector;
  constructor(config = {}) {
    this.workflowRegistry = new WorkflowRegistry();
    this.contextManager = new ContextManager(this.workflowRegistry);
    const sessionStore = config.sessionStore || new InMemorySessionStore();
    this.sessionManager = new SessionManager(sessionStore, config.sessionTimeout);
    this.intentDetector = config.intentDetector || new RuleBasedIntentDetector(this.workflowRegistry);
  }
  // Workflow registration
  registerWorkflow(definition) {
    this.workflowRegistry.register(definition);
  }
  getRegisteredWorkflows() {
    return this.workflowRegistry.getAll();
  }
  // Context management
  registerContextLoader(workflowId, loader) {
    this.contextManager.registerLoader(workflowId, loader);
  }
  // Main message processing
  async processMessage(message, sessionId, userId = "default-user", userName = "User") {
    const session = await this.sessionManager.getOrCreateSession(
      sessionId,
      userId,
      userName
    );
    await this.sessionManager.addMessage(session.sessionId, {
      id: `msg_${Date.now()}`,
      timestamp: /* @__PURE__ */ new Date(),
      role: "user",
      content: message
    });
    const intent = await this.intentDetector.analyzeMessage(message, session);
    let workflowChanged = false;
    if (intent.shouldSwitchWorkflow && intent.targetWorkflow) {
      await this.contextManager.switchContext(
        session,
        intent.targetWorkflow,
        intent.extractedData
      );
      workflowChanged = true;
    }
    await this.sessionManager.updateSession(session);
    return {
      session,
      intent,
      workflowChanged
    };
  }
  // Session management
  async getSession(sessionId) {
    return this.sessionManager.getSession(sessionId);
  }
  async createSession(userId, userName, sessionId) {
    return this.sessionManager.createSession(userId, userName, sessionId);
  }
  async updateSession(session) {
    return this.sessionManager.updateSession(session);
  }
  async deleteSession(sessionId) {
    return this.sessionManager.deleteSession(sessionId);
  }
  async addMessage(sessionId, role, content) {
    await this.sessionManager.addMessage(sessionId, {
      id: `msg_${Date.now()}`,
      timestamp: /* @__PURE__ */ new Date(),
      role,
      content
    });
  }
  // Context switching
  async switchWorkflow(sessionId, targetWorkflow, initData) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    await this.contextManager.switchContext(session, targetWorkflow, initData);
    await this.sessionManager.updateSession(session);
    return session;
  }
  // Workflow state management
  async updateWorkflowProgress(sessionId, step, percentage) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    this.contextManager.updateWorkflowProgress(session, step, percentage);
    await this.sessionManager.updateSession(session);
  }
  async addWorkflowCheckpoint(sessionId, description, data) {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    this.contextManager.addWorkflowCheckpoint(session, description, data);
    await this.sessionManager.updateSession(session);
  }
  // Analytics and monitoring
  async getSessionStats() {
    return this.sessionManager.getStats();
  }
  async cleanupExpiredSessions() {
    return this.sessionManager.cleanup();
  }
  // Health check
  async healthCheck() {
    const components = {
      sessionStore: true,
      // TODO: Add health check to session store
      workflowRegistry: this.workflowRegistry.getAll().length > 0,
      contextManager: true,
      // TODO: Add health check to context manager
      intentDetector: true
      // TODO: Add health check to intent detector
    };
    const allHealthy = Object.values(components).every(Boolean);
    const status = allHealthy ? "healthy" : "degraded";
    const stats = await this.getSessionStats();
    return {
      status,
      components,
      metrics: {
        activeSessions: stats.activeSessions,
        registeredWorkflows: this.workflowRegistry.getAll().length,
        uptime: process.uptime() * 1e3
        // Convert to milliseconds
      }
    };
  }
  // Utility methods for testing/debugging
  getWorkflowRegistry() {
    return this.workflowRegistry;
  }
  getContextManager() {
    return this.contextManager;
  }
  getSessionManager() {
    return this.sessionManager;
  }
  getIntentDetector() {
    return this.intentDetector;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ContextManager,
  InMemorySessionStore,
  Orchestrator,
  RedisSessionStore,
  RuleBasedIntentDetector,
  SessionManager,
  WorkflowRegistry
});
//# sourceMappingURL=index.js.map