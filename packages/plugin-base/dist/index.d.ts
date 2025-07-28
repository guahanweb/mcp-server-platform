import * as _mcp_types from '@mcp/types';
import { MCPPlugin, PluginMetadata, PluginContext, MCPToolDefinition, MCPResourceDefinition, MCPPromptDefinition, WorkflowPluginMetadata } from '@mcp/types';

declare abstract class BasePlugin implements MCPPlugin {
    abstract metadata: PluginMetadata;
    initialize(this: PluginContext): Promise<void>;
    protected abstract defineTools(): MCPToolDefinition[];
    protected defineResources(): MCPResourceDefinition[];
    protected definePrompts(): MCPPromptDefinition[];
    protected onInitialize(): Promise<void>;
    shutdown(): Promise<void>;
    protected toolName(name: string): string;
    protected createTool(name: string, description: string, properties: Record<string, any>, required: string[], handler: (params: any, context: PluginContext) => Promise<any>): MCPToolDefinition;
    protected createResource(uri: string, name: string, description: string, handler: (context: PluginContext) => Promise<any>, mimeType?: string): MCPResourceDefinition;
    protected createPrompt(name: string, description: string, handler: (args: Record<string, any>, context: PluginContext) => Promise<{
        messages: any[];
    }>, args?: {
        name: string;
        description: string;
        required?: boolean;
    }[]): MCPPromptDefinition;
}

declare abstract class WorkflowPlugin extends BasePlugin {
    abstract metadata: WorkflowPluginMetadata;
    abstract getSystemPrompt(context?: any): string;
    abstract onWorkflowEnter?(context: any): Promise<void>;
    abstract onWorkflowExit?(context: any): Promise<void>;
    protected getWorkflowState<T = any>(context: PluginContext): Promise<T | undefined>;
    protected updateWorkflowState<T = any>(context: PluginContext, state: T): Promise<void>;
    protected initializeWorkflowState<T = any>(context: PluginContext, initialState: T): Promise<T>;
    protected updateProgress(context: PluginContext, step: string, percentage: number): Promise<void>;
    protected addCheckpoint(context: PluginContext, description: string, data?: any): Promise<void>;
    protected validateRequiredContext(context: any, required: string[]): void;
    protected matchesTrigger(message: string, triggers: string[]): boolean;
    protected matchesExitSignal(message: string, exitSignals: string[]): boolean;
    protected createWorkflowTool(name: string, description: string, properties: Record<string, any>, required: string[], handler: (params: any, context: PluginContext) => Promise<any>): _mcp_types.MCPToolDefinition;
}

/**
 * Common tool parameter schemas
 */
declare const CommonSchemas: {
    string: (description: string, required?: boolean) => {
        required?: boolean | undefined;
        type: string;
        description: string;
    };
    number: (description: string, min?: number, max?: number) => {
        maximum?: number | undefined;
        minimum?: number | undefined;
        type: string;
        description: string;
    };
    boolean: (description: string) => {
        type: string;
        description: string;
    };
    array: (description: string, itemType: any) => {
        type: string;
        description: string;
        items: any;
    };
    enum: (description: string, values: string[]) => {
        type: string;
        description: string;
        enum: string[];
    };
    object: (description: string, properties: Record<string, any>) => {
        type: string;
        description: string;
        properties: Record<string, any>;
        additionalProperties: boolean;
    };
};
/**
 * Tool builder with fluent API
 */
declare class ToolBuilder {
    private name;
    private description;
    private properties;
    private required;
    private handler?;
    constructor(name: string, description: string);
    addParameter(name: string, schema: any, isRequired?: boolean): ToolBuilder;
    addStringParameter(name: string, description: string, isRequired?: boolean): ToolBuilder;
    addNumberParameter(name: string, description: string, min?: number, max?: number, isRequired?: boolean): ToolBuilder;
    addBooleanParameter(name: string, description: string, isRequired?: boolean): ToolBuilder;
    addEnumParameter(name: string, description: string, values: string[], isRequired?: boolean): ToolBuilder;
    addArrayParameter(name: string, description: string, itemType: any, isRequired?: boolean): ToolBuilder;
    addObjectParameter(name: string, description: string, properties: Record<string, any>, isRequired?: boolean): ToolBuilder;
    setHandler(handler: (params: any, context: PluginContext) => Promise<any>): ToolBuilder;
    build(): MCPToolDefinition;
}
/**
 * Create a tool with the builder pattern
 */
declare function createTool(name: string, description: string): ToolBuilder;
/**
 * Common tool patterns
 */
declare const ToolPatterns: {
    simpleStringTool: (name: string, description: string, inputParamName: string, inputDescription: string, handler: (input: string, context: PluginContext) => Promise<string>) => MCPToolDefinition;
    configTool: (name: string, description: string, configSchema: Record<string, any>, handler: (config: any, context: PluginContext) => Promise<any>) => MCPToolDefinition;
    createTool: (entityName: string, properties: Record<string, any>, handler: (data: any, context: PluginContext) => Promise<any>) => MCPToolDefinition;
    readTool: (entityName: string, handler: (id: string, context: PluginContext) => Promise<any>) => MCPToolDefinition;
    updateTool: (entityName: string, properties: Record<string, any>, handler: (id: string, data: any, context: PluginContext) => Promise<any>) => MCPToolDefinition;
    deleteTool: (entityName: string, handler: (id: string, context: PluginContext) => Promise<any>) => MCPToolDefinition;
};

/**
 * Helper functions for working with plugin context
 */
declare class ContextHelper {
    private context;
    constructor(context: PluginContext);
    getSessionId(): string | undefined;
    getUserId(): string | undefined;
    getCurrentWorkflow(): string | undefined;
    getMessage(): string | undefined;
    getMetadata(): Record<string, any> | undefined;
    getState<T = any>(): Promise<T | undefined>;
    updateState<T = any>(state: T): Promise<void>;
    mergeState(updates: Record<string, any>): Promise<void>;
    getStateProperty<T = any>(key: string): Promise<T | undefined>;
    setStateProperty<T = any>(key: string, value: T): Promise<void>;
    getConfig(): Record<string, any>;
    getConfigValue<T = any>(key: string, defaultValue?: T): T;
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    requireSessionId(): string;
    requireUserId(): string;
    requireWorkflow(): string;
    requireState<T = any>(): T;
}
/**
 * Create a context helper instance
 */
declare function createContextHelper(context: PluginContext): ContextHelper;
/**
 * State management utilities
 */
declare const StateUtils: {
    initializeState<T>(context: PluginContext, initialState: T): Promise<T>;
    updateNestedProperty(context: PluginContext, path: string, value: any): Promise<void>;
    getNestedProperty<T = any>(state: any, path: string, defaultValue?: T): T;
    addToArray(context: PluginContext, arrayPath: string, item: any): Promise<void>;
    removeFromArray(context: PluginContext, arrayPath: string, predicate: (item: any) => boolean): Promise<void>;
};
/**
 * Request context utilities
 */
declare const RequestUtils: {
    extractEmail(message: string): string | null;
    extractUrl(message: string): string | null;
    extractNumber(message: string): number | null;
    containsQuestion(message: string): boolean;
    containsNegation(message: string): boolean;
    containsUrgency(message: string): boolean;
};

/**
 * Validation utilities for MCP plugins
 */
declare class ValidationError extends Error {
    field?: string | undefined;
    value?: any | undefined;
    constructor(message: string, field?: string | undefined, value?: any | undefined);
}
type ValidationRule<T = any> = (value: T, field: string) => string | null;
/**
 * Common validation rules
 */
declare const ValidationRules: {
    required: <T>(value: T, field: string) => string | null;
    string: (value: any, field: string) => string | null;
    number: (value: any, field: string) => string | null;
    boolean: (value: any, field: string) => string | null;
    array: (value: any, field: string) => string | null;
    object: (value: any, field: string) => string | null;
    minLength: (min: number) => ValidationRule<string>;
    maxLength: (max: number) => ValidationRule<string>;
    min: (min: number) => ValidationRule<number>;
    max: (max: number) => ValidationRule<number>;
    email: (value: string, field: string) => string | null;
    url: (value: string, field: string) => string | null;
    oneOf: <T>(options: T[]) => ValidationRule<T>;
    pattern: (regex: RegExp, message?: string) => ValidationRule<string>;
};
/**
 * Validator class for validating objects
 */
declare class Validator {
    private rules;
    addRule(field: string, ...rules: ValidationRule[]): Validator;
    validate(data: Record<string, any>): ValidationError[];
    validateAndThrow(data: Record<string, any>): void;
    isValid(data: Record<string, any>): boolean;
}
/**
 * Helper function to create a validator
 */
declare function createValidator(): Validator;
/**
 * Common validation schemas
 */
declare const CommonValidators: {
    email: Validator;
    url: Validator;
    positiveNumber: Validator;
    nonEmptyString: Validator;
    id: Validator;
    name: Validator;
    description: Validator;
};
/**
 * Validation decorators
 */
declare function validate(validator: Validator): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Parameter validation helpers
 */
declare const ParamValidation: {
    requireString: (value: any, name: string) => string;
    requireNumber: (value: any, name: string) => number;
    requireBoolean: (value: any, name: string) => boolean;
    requireArray: (value: any, name: string) => any[];
    requireObject: (value: any, name: string) => Record<string, any>;
    optional: <T>(value: any, validator: (val: any, name: string) => T, name: string) => T | undefined;
};

export { BasePlugin, CommonSchemas, CommonValidators, ContextHelper, ParamValidation, RequestUtils, StateUtils, ToolBuilder, ToolPatterns, ValidationError, type ValidationRule, ValidationRules, Validator, WorkflowPlugin, createContextHelper, createTool, createValidator, validate };
