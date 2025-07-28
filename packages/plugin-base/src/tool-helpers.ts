import { MCPToolDefinition, PluginContext } from '@mcp/types';

/**
 * Common tool parameter schemas
 */
export const CommonSchemas = {
  string: (description: string, required = true) => ({
    type: 'string',
    description,
    ...(required ? {} : { required: false })
  }),

  number: (description: string, min?: number, max?: number) => ({
    type: 'number',
    description,
    ...(min !== undefined ? { minimum: min } : {}),
    ...(max !== undefined ? { maximum: max } : {})
  }),

  boolean: (description: string) => ({
    type: 'boolean',
    description
  }),

  array: (description: string, itemType: any) => ({
    type: 'array',
    description,
    items: itemType
  }),

  enum: (description: string, values: string[]) => ({
    type: 'string',
    description,
    enum: values
  }),

  object: (description: string, properties: Record<string, any>) => ({
    type: 'object',
    description,
    properties,
    additionalProperties: false
  })
};

/**
 * Tool builder with fluent API
 */
export class ToolBuilder {
  private name: string;
  private description: string;
  private properties: Record<string, any> = {};
  private required: string[] = [];
  private handler?: (params: any, context: PluginContext) => Promise<any>;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  addParameter(name: string, schema: any, isRequired = false): ToolBuilder {
    this.properties[name] = schema;
    if (isRequired) {
      this.required.push(name);
    }
    return this;
  }

  addStringParameter(name: string, description: string, isRequired = false): ToolBuilder {
    return this.addParameter(name, CommonSchemas.string(description), isRequired);
  }

  addNumberParameter(name: string, description: string, min?: number, max?: number, isRequired = false): ToolBuilder {
    return this.addParameter(name, CommonSchemas.number(description, min, max), isRequired);
  }

  addBooleanParameter(name: string, description: string, isRequired = false): ToolBuilder {
    return this.addParameter(name, CommonSchemas.boolean(description), isRequired);
  }

  addEnumParameter(name: string, description: string, values: string[], isRequired = false): ToolBuilder {
    return this.addParameter(name, CommonSchemas.enum(description, values), isRequired);
  }

  addArrayParameter(name: string, description: string, itemType: any, isRequired = false): ToolBuilder {
    return this.addParameter(name, CommonSchemas.array(description, itemType), isRequired);
  }

  addObjectParameter(name: string, description: string, properties: Record<string, any>, isRequired = false): ToolBuilder {
    return this.addParameter(name, CommonSchemas.object(description, properties), isRequired);
  }

  setHandler(handler: (params: any, context: PluginContext) => Promise<any>): ToolBuilder {
    this.handler = handler;
    return this;
  }

  build(): MCPToolDefinition {
    if (!this.handler) {
      throw new Error(`Tool ${this.name} is missing a handler`);
    }

    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: this.properties,
        required: this.required,
        additionalProperties: false
      },
      handler: this.handler
    };
  }
}

/**
 * Create a tool with the builder pattern
 */
export function createTool(name: string, description: string): ToolBuilder {
  return new ToolBuilder(name, description);
}

/**
 * Common tool patterns
 */
export const ToolPatterns = {
  // Simple string input/output tool
  simpleStringTool: (
    name: string,
    description: string,
    inputParamName: string,
    inputDescription: string,
    handler: (input: string, context: PluginContext) => Promise<string>
  ): MCPToolDefinition => {
    return createTool(name, description)
      .addStringParameter(inputParamName, inputDescription, true)
      .setHandler(async (params, context) => {
        return await handler(params[inputParamName], context);
      })
      .build();
  },

  // Configuration tool
  configTool: (
    name: string,
    description: string,
    configSchema: Record<string, any>,
    handler: (config: any, context: PluginContext) => Promise<any>
  ): MCPToolDefinition => {
    return createTool(name, description)
      .addObjectParameter('config', 'Configuration object', configSchema, true)
      .setHandler(async (params, context) => {
        return await handler(params.config, context);
      })
      .build();
  },

  // CRUD operations
  createTool: (
    entityName: string,
    properties: Record<string, any>,
    handler: (data: any, context: PluginContext) => Promise<any>
  ): MCPToolDefinition => {
    return createTool(`create_${entityName}`, `Create a new ${entityName}`)
      .addObjectParameter('data', `${entityName} data`, properties, true)
      .setHandler(async (params, context) => {
        return await handler(params.data, context);
      })
      .build();
  },

  readTool: (
    entityName: string,
    handler: (id: string, context: PluginContext) => Promise<any>
  ): MCPToolDefinition => {
    return createTool(`read_${entityName}`, `Read a ${entityName} by ID`)
      .addStringParameter('id', `${entityName} ID`, true)
      .setHandler(async (params, context) => {
        return await handler(params.id, context);
      })
      .build();
  },

  updateTool: (
    entityName: string,
    properties: Record<string, any>,
    handler: (id: string, data: any, context: PluginContext) => Promise<any>
  ): MCPToolDefinition => {
    return createTool(`update_${entityName}`, `Update a ${entityName}`)
      .addStringParameter('id', `${entityName} ID`, true)
      .addObjectParameter('data', `Updated ${entityName} data`, properties, true)
      .setHandler(async (params, context) => {
        return await handler(params.id, params.data, context);
      })
      .build();
  },

  deleteTool: (
    entityName: string,
    handler: (id: string, context: PluginContext) => Promise<any>
  ): MCPToolDefinition => {
    return createTool(`delete_${entityName}`, `Delete a ${entityName}`)
      .addStringParameter('id', `${entityName} ID`, true)
      .setHandler(async (params, context) => {
        return await handler(params.id, context);
      })
      .build();
  }
};