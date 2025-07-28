import { BasePlugin, createTool } from '@mcp/plugin-base';
import { PluginMetadata, MCPToolDefinition } from '@mcp/types';

export class SimpleToolsPlugin extends BasePlugin {
  metadata: PluginMetadata = {
    id: 'simple-tools',
    name: 'Simple Tools Plugin',
    version: '1.0.0',
    description: 'A collection of simple utility tools',
    author: 'MCP Platform',
    keywords: ['utility', 'tools', 'example']
  };

  protected defineTools(): MCPToolDefinition[] {
    return [
      createTool('echo', 'Echo back the input text')
        .addStringParameter('text', 'Text to echo back', true)
        .setHandler(async (params) => {
          return `Echo: ${params.text}`;
        })
        .build(),

      createTool('add', 'Add two numbers together')
        .addNumberParameter('a', 'First number', undefined, undefined, true)
        .addNumberParameter('b', 'Second number', undefined, undefined, true)
        .setHandler(async (params) => {
          const result = params.a + params.b;
          return `${params.a} + ${params.b} = ${result}`;
        })
        .build(),

      createTool('get-time', 'Get the current time')
        .setHandler(async () => {
          return new Date().toISOString();
        })
        .build(),

      createTool('count-words', 'Count words in a text')
        .addStringParameter('text', 'Text to count words in', true)
        .setHandler(async (params) => {
          const words = params.text.trim().split(/\s+/).filter(word => word.length > 0);
          return {
            text: params.text,
            wordCount: words.length,
            characterCount: params.text.length,
            words: words
          };
        })
        .build()
    ];
  }
}