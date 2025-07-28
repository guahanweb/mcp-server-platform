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
  BasePlugin: () => BasePlugin,
  CommonSchemas: () => CommonSchemas,
  CommonValidators: () => CommonValidators,
  ContextHelper: () => ContextHelper,
  ParamValidation: () => ParamValidation,
  RequestUtils: () => RequestUtils,
  StateUtils: () => StateUtils,
  ToolBuilder: () => ToolBuilder,
  ToolPatterns: () => ToolPatterns,
  ValidationError: () => ValidationError,
  ValidationRules: () => ValidationRules,
  Validator: () => Validator,
  WorkflowPlugin: () => WorkflowPlugin,
  createContextHelper: () => createContextHelper,
  createTool: () => createTool,
  createValidator: () => createValidator,
  validate: () => validate
});
module.exports = __toCommonJS(index_exports);

// src/base-plugin.ts
var BasePlugin = class {
  async initialize() {
    const pluginInstance = this.__plugin_instance__;
    const tools = pluginInstance.defineTools();
    for (const tool of tools) {
      this.registerTool(tool);
    }
    const resources = pluginInstance.defineResources();
    for (const resource of resources) {
      this.registerResource(resource);
    }
    const prompts = pluginInstance.definePrompts();
    for (const prompt of prompts) {
      this.registerPrompt(prompt);
    }
    await pluginInstance.onInitialize();
  }
  defineResources() {
    return [];
  }
  definePrompts() {
    return [];
  }
  async onInitialize() {
  }
  async shutdown() {
  }
  // Helper method for consistent tool naming
  toolName(name) {
    return `${this.metadata.id}:${name}`;
  }
  // Helper for creating tool definitions with consistent structure
  createTool(name, description, properties, required, handler) {
    return {
      name,
      // Just the tool name, framework will add prefix
      description,
      inputSchema: {
        type: "object",
        properties,
        required
      },
      handler
    };
  }
  // Helper for creating resource definitions
  createResource(uri, name, description, handler, mimeType) {
    return {
      uri,
      name,
      description,
      mimeType,
      handler
    };
  }
  // Helper for creating prompt definitions
  createPrompt(name, description, handler, args) {
    return {
      name: this.toolName(name),
      description,
      arguments: args,
      handler
    };
  }
};

// src/workflow-plugin.ts
var WorkflowPlugin = class extends BasePlugin {
  // State management helpers
  async getWorkflowState(context) {
    return context.getWorkflowState();
  }
  async updateWorkflowState(context, state) {
    await context.updateWorkflowState(state);
  }
  async initializeWorkflowState(context, initialState) {
    const existingState = await this.getWorkflowState(context);
    if (!existingState) {
      await this.updateWorkflowState(context, initialState);
      return initialState;
    }
    return existingState;
  }
  // Progress tracking helpers
  async updateProgress(context, step, percentage) {
    const state = await this.getWorkflowState(context) || {};
    const updatedState = {
      ...state,
      currentStep: step,
      progress: percentage,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.updateWorkflowState(context, updatedState);
  }
  async addCheckpoint(context, description, data) {
    const state = await this.getWorkflowState(context) || {};
    const checkpoint = {
      id: `checkpoint_${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
  validateRequiredContext(context, required) {
    for (const key of required) {
      if (!(key in context)) {
        throw new Error(`Required context missing: ${key}`);
      }
    }
  }
  // Intent detection helpers
  matchesTrigger(message, triggers) {
    const lowerMessage = message.toLowerCase();
    return triggers.some(
      (trigger) => lowerMessage.includes(trigger.toLowerCase())
    );
  }
  matchesExitSignal(message, exitSignals) {
    const lowerMessage = message.toLowerCase();
    return exitSignals.some(
      (signal) => lowerMessage.includes(signal.toLowerCase())
    );
  }
  // Tool creation with workflow context
  createWorkflowTool(name, description, properties, required, handler) {
    return this.createTool(name, description, properties, required, async (params, context) => {
      await this.initializeWorkflowState(context, {
        workflowId: this.metadata.id,
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        currentStep: name,
        data: {}
      });
      return await handler(params, context);
    });
  }
};

// src/tool-helpers.ts
var CommonSchemas = {
  string: (description, required = true) => ({
    type: "string",
    description,
    ...required ? {} : { required: false }
  }),
  number: (description, min, max) => ({
    type: "number",
    description,
    ...min !== void 0 ? { minimum: min } : {},
    ...max !== void 0 ? { maximum: max } : {}
  }),
  boolean: (description) => ({
    type: "boolean",
    description
  }),
  array: (description, itemType) => ({
    type: "array",
    description,
    items: itemType
  }),
  enum: (description, values) => ({
    type: "string",
    description,
    enum: values
  }),
  object: (description, properties) => ({
    type: "object",
    description,
    properties,
    additionalProperties: false
  })
};
var ToolBuilder = class {
  name;
  description;
  properties = {};
  required = [];
  handler;
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }
  addParameter(name, schema, isRequired = false) {
    this.properties[name] = schema;
    if (isRequired) {
      this.required.push(name);
    }
    return this;
  }
  addStringParameter(name, description, isRequired = false) {
    return this.addParameter(name, CommonSchemas.string(description), isRequired);
  }
  addNumberParameter(name, description, min, max, isRequired = false) {
    return this.addParameter(name, CommonSchemas.number(description, min, max), isRequired);
  }
  addBooleanParameter(name, description, isRequired = false) {
    return this.addParameter(name, CommonSchemas.boolean(description), isRequired);
  }
  addEnumParameter(name, description, values, isRequired = false) {
    return this.addParameter(name, CommonSchemas.enum(description, values), isRequired);
  }
  addArrayParameter(name, description, itemType, isRequired = false) {
    return this.addParameter(name, CommonSchemas.array(description, itemType), isRequired);
  }
  addObjectParameter(name, description, properties, isRequired = false) {
    return this.addParameter(name, CommonSchemas.object(description, properties), isRequired);
  }
  setHandler(handler) {
    this.handler = handler;
    return this;
  }
  build() {
    if (!this.handler) {
      throw new Error(`Tool ${this.name} is missing a handler`);
    }
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: "object",
        properties: this.properties,
        required: this.required,
        additionalProperties: false
      },
      handler: this.handler
    };
  }
};
function createTool(name, description) {
  return new ToolBuilder(name, description);
}
var ToolPatterns = {
  // Simple string input/output tool
  simpleStringTool: (name, description, inputParamName, inputDescription, handler) => {
    return createTool(name, description).addStringParameter(inputParamName, inputDescription, true).setHandler(async (params, context) => {
      return await handler(params[inputParamName], context);
    }).build();
  },
  // Configuration tool
  configTool: (name, description, configSchema, handler) => {
    return createTool(name, description).addObjectParameter("config", "Configuration object", configSchema, true).setHandler(async (params, context) => {
      return await handler(params.config, context);
    }).build();
  },
  // CRUD operations
  createTool: (entityName, properties, handler) => {
    return createTool(`create_${entityName}`, `Create a new ${entityName}`).addObjectParameter("data", `${entityName} data`, properties, true).setHandler(async (params, context) => {
      return await handler(params.data, context);
    }).build();
  },
  readTool: (entityName, handler) => {
    return createTool(`read_${entityName}`, `Read a ${entityName} by ID`).addStringParameter("id", `${entityName} ID`, true).setHandler(async (params, context) => {
      return await handler(params.id, context);
    }).build();
  },
  updateTool: (entityName, properties, handler) => {
    return createTool(`update_${entityName}`, `Update a ${entityName}`).addStringParameter("id", `${entityName} ID`, true).addObjectParameter("data", `Updated ${entityName} data`, properties, true).setHandler(async (params, context) => {
      return await handler(params.id, params.data, context);
    }).build();
  },
  deleteTool: (entityName, handler) => {
    return createTool(`delete_${entityName}`, `Delete a ${entityName}`).addStringParameter("id", `${entityName} ID`, true).setHandler(async (params, context) => {
      return await handler(params.id, context);
    }).build();
  }
};

// src/context-helpers.ts
var ContextHelper = class {
  constructor(context) {
    this.context = context;
  }
  // Request context helpers
  getSessionId() {
    return this.context.getRequestContext()?.sessionId;
  }
  getUserId() {
    return this.context.getRequestContext()?.userId;
  }
  getCurrentWorkflow() {
    return this.context.getRequestContext()?.currentWorkflow;
  }
  getMessage() {
    return this.context.getRequestContext()?.message;
  }
  getMetadata() {
    return this.context.getRequestContext()?.metadata;
  }
  // State management helpers
  async getState() {
    return this.context.getWorkflowState();
  }
  async updateState(state) {
    await this.context.updateWorkflowState(state);
  }
  async mergeState(updates) {
    const currentState = await this.getState() || {};
    const newState = { ...currentState, ...updates };
    await this.updateState(newState);
  }
  async getStateProperty(key) {
    const state = await this.getState();
    return state ? state[key] : void 0;
  }
  async setStateProperty(key, value) {
    await this.mergeState({ [key]: value });
  }
  // Configuration helpers
  getConfig() {
    return this.context.config;
  }
  getConfigValue(key, defaultValue) {
    return this.context.config[key] ?? defaultValue;
  }
  // Logging helpers
  debug(message, ...args) {
    this.context.logger.debug(message, ...args);
  }
  info(message, ...args) {
    this.context.logger.info(message, ...args);
  }
  warn(message, ...args) {
    this.context.logger.warn(message, ...args);
  }
  error(message, ...args) {
    this.context.logger.error(message, ...args);
  }
  // Validation helpers
  requireSessionId() {
    const sessionId = this.getSessionId();
    if (!sessionId) {
      throw new Error("Session ID is required but not provided");
    }
    return sessionId;
  }
  requireUserId() {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User ID is required but not provided");
    }
    return userId;
  }
  requireWorkflow() {
    const workflow = this.getCurrentWorkflow();
    if (!workflow) {
      throw new Error("Current workflow is required but not set");
    }
    return workflow;
  }
  requireState() {
    const state = this.context.getWorkflowState();
    if (!state) {
      throw new Error("Workflow state is required but not available");
    }
    return state;
  }
};
function createContextHelper(context) {
  return new ContextHelper(context);
}
var StateUtils = {
  // Initialize state if it doesn't exist
  async initializeState(context, initialState) {
    const existingState = context.getWorkflowState();
    if (!existingState) {
      await context.updateWorkflowState(initialState);
      return initialState;
    }
    return existingState;
  },
  // Update nested property in state
  async updateNestedProperty(context, path, value) {
    const state = context.getWorkflowState() || {};
    const keys = path.split(".");
    let current = state;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    await context.updateWorkflowState(state);
  },
  // Get nested property from state
  getNestedProperty(state, path, defaultValue) {
    const keys = path.split(".");
    let current = state;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    return current;
  },
  // Add item to array in state
  async addToArray(context, arrayPath, item) {
    const state = context.getWorkflowState() || {};
    const currentArray = StateUtils.getNestedProperty(state, arrayPath, []);
    const newArray = [...currentArray, item];
    await StateUtils.updateNestedProperty(context, arrayPath, newArray);
  },
  // Remove item from array in state
  async removeFromArray(context, arrayPath, predicate) {
    const state = context.getWorkflowState() || {};
    const currentArray = StateUtils.getNestedProperty(state, arrayPath, []);
    const newArray = currentArray.filter((item) => !predicate(item));
    await StateUtils.updateNestedProperty(context, arrayPath, newArray);
  }
};
var RequestUtils = {
  // Extract information from user message
  extractEmail(message) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = message.match(emailRegex);
    return match ? match[0] : null;
  },
  extractUrl(message) {
    const urlRegex = /https?:\/\/[^\s]+/;
    const match = message.match(urlRegex);
    return match ? match[0] : null;
  },
  extractNumber(message) {
    const numberRegex = /\b\d+(?:\.\d+)?\b/;
    const match = message.match(numberRegex);
    return match ? parseFloat(match[0]) : null;
  },
  // Check if message contains specific patterns
  containsQuestion(message) {
    return message.includes("?") || message.toLowerCase().startsWith("what") || message.toLowerCase().startsWith("how") || message.toLowerCase().startsWith("why") || message.toLowerCase().startsWith("when") || message.toLowerCase().startsWith("where") || message.toLowerCase().startsWith("who");
  },
  containsNegation(message) {
    const negationWords = ["no", "not", "never", "none", "nothing", "nobody", "nowhere"];
    const lowerMessage = message.toLowerCase();
    return negationWords.some((word) => lowerMessage.includes(word));
  },
  containsUrgency(message) {
    const urgencyWords = ["urgent", "asap", "immediately", "quickly", "rush", "emergency"];
    const lowerMessage = message.toLowerCase();
    return urgencyWords.some((word) => lowerMessage.includes(word));
  }
};

// src/validation.ts
var ValidationError = class extends Error {
  constructor(message, field, value) {
    super(message);
    this.field = field;
    this.value = value;
    this.name = "ValidationError";
  }
};
var ValidationRules = {
  required: (value, field) => {
    if (value === null || value === void 0 || value === "") {
      return `${field} is required`;
    }
    return null;
  },
  string: (value, field) => {
    if (typeof value !== "string") {
      return `${field} must be a string`;
    }
    return null;
  },
  number: (value, field) => {
    if (typeof value !== "number" || isNaN(value)) {
      return `${field} must be a valid number`;
    }
    return null;
  },
  boolean: (value, field) => {
    if (typeof value !== "boolean") {
      return `${field} must be a boolean`;
    }
    return null;
  },
  array: (value, field) => {
    if (!Array.isArray(value)) {
      return `${field} must be an array`;
    }
    return null;
  },
  object: (value, field) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return `${field} must be an object`;
    }
    return null;
  },
  minLength: (min) => {
    return (value, field) => {
      if (typeof value === "string" && value.length < min) {
        return `${field} must be at least ${min} characters long`;
      }
      return null;
    };
  },
  maxLength: (max) => {
    return (value, field) => {
      if (typeof value === "string" && value.length > max) {
        return `${field} must be no more than ${max} characters long`;
      }
      return null;
    };
  },
  min: (min) => {
    return (value, field) => {
      if (typeof value === "number" && value < min) {
        return `${field} must be at least ${min}`;
      }
      return null;
    };
  },
  max: (max) => {
    return (value, field) => {
      if (typeof value === "number" && value > max) {
        return `${field} must be no more than ${max}`;
      }
      return null;
    };
  },
  email: (value, field) => {
    if (typeof value === "string") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${field} must be a valid email address`;
      }
    }
    return null;
  },
  url: (value, field) => {
    if (typeof value === "string") {
      try {
        new URL(value);
      } catch {
        return `${field} must be a valid URL`;
      }
    }
    return null;
  },
  oneOf: (options) => {
    return (value, field) => {
      if (!options.includes(value)) {
        return `${field} must be one of: ${options.join(", ")}`;
      }
      return null;
    };
  },
  pattern: (regex, message) => {
    return (value, field) => {
      if (typeof value === "string" && !regex.test(value)) {
        return message || `${field} does not match the required pattern`;
      }
      return null;
    };
  }
};
var Validator = class {
  rules = /* @__PURE__ */ new Map();
  addRule(field, ...rules) {
    const existingRules = this.rules.get(field) || [];
    this.rules.set(field, [...existingRules, ...rules]);
    return this;
  }
  validate(data) {
    const errors = [];
    for (const [field, rules] of this.rules) {
      const value = data[field];
      for (const rule of rules) {
        const error = rule(value, field);
        if (error) {
          errors.push(new ValidationError(error, field, value));
          break;
        }
      }
    }
    return errors;
  }
  validateAndThrow(data) {
    const errors = this.validate(data);
    if (errors.length > 0) {
      const message = errors.map((e) => e.message).join(", ");
      throw new ValidationError(`Validation failed: ${message}`);
    }
  }
  isValid(data) {
    return this.validate(data).length === 0;
  }
};
function createValidator() {
  return new Validator();
}
var CommonValidators = {
  email: createValidator().addRule("email", ValidationRules.required, ValidationRules.string, ValidationRules.email),
  url: createValidator().addRule("url", ValidationRules.required, ValidationRules.string, ValidationRules.url),
  positiveNumber: createValidator().addRule("value", ValidationRules.required, ValidationRules.number, ValidationRules.min(0)),
  nonEmptyString: createValidator().addRule("value", ValidationRules.required, ValidationRules.string, ValidationRules.minLength(1)),
  id: createValidator().addRule("id", ValidationRules.required, ValidationRules.string, ValidationRules.minLength(1)),
  name: createValidator().addRule("name", ValidationRules.required, ValidationRules.string, ValidationRules.minLength(1), ValidationRules.maxLength(100)),
  description: createValidator().addRule("description", ValidationRules.string, ValidationRules.maxLength(1e3))
};
function validate(validator) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    descriptor.value = function(...args) {
      const params = args[0];
      if (params && typeof params === "object") {
        validator.validateAndThrow(params);
      }
      return method.apply(this, args);
    };
    return descriptor;
  };
}
var ParamValidation = {
  requireString: (value, name) => {
    if (typeof value !== "string") {
      throw new ValidationError(`${name} must be a string`, name, value);
    }
    return value;
  },
  requireNumber: (value, name) => {
    if (typeof value !== "number" || isNaN(value)) {
      throw new ValidationError(`${name} must be a valid number`, name, value);
    }
    return value;
  },
  requireBoolean: (value, name) => {
    if (typeof value !== "boolean") {
      throw new ValidationError(`${name} must be a boolean`, name, value);
    }
    return value;
  },
  requireArray: (value, name) => {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${name} must be an array`, name, value);
    }
    return value;
  },
  requireObject: (value, name) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new ValidationError(`${name} must be an object`, name, value);
    }
    return value;
  },
  optional: (value, validator, name) => {
    if (value === void 0 || value === null) {
      return void 0;
    }
    return validator(value, name);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BasePlugin,
  CommonSchemas,
  CommonValidators,
  ContextHelper,
  ParamValidation,
  RequestUtils,
  StateUtils,
  ToolBuilder,
  ToolPatterns,
  ValidationError,
  ValidationRules,
  Validator,
  WorkflowPlugin,
  createContextHelper,
  createTool,
  createValidator,
  validate
});
//# sourceMappingURL=index.js.map