#!/usr/bin/env node

import { program } from 'commander';
import { initCommand } from './commands/init';
import { createPluginCommand } from './commands/create-plugin';
import { addToolCommand } from './commands/add-tool';

program
  .name('create-mcp-server')
  .description('CLI tool for scaffolding MCP servers and plugins')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new MCP server project')
  .argument('[name]', 'Project name')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .option('-d, --directory <dir>', 'Target directory')
  .action(initCommand);

program
  .command('create-plugin')
  .description('Create a new plugin')
  .argument('<name>', 'Plugin name')
  .option('-t, --type <type>', 'Plugin type', 'basic')
  .option('-d, --directory <dir>', 'Target directory', './src/plugins')
  .action(createPluginCommand);

program
  .command('add-tool')
  .description('Add a new tool to an existing plugin')
  .argument('<name>', 'Tool name')
  .option('-p, --plugin <plugin>', 'Plugin name', 'main')
  .option('-d, --directory <dir>', 'Plugin directory', './src/plugins')
  .action(addToolCommand);

program.parse();