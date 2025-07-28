// src/commands/init.ts
async function initCommand(name, options = {}) {
  console.log(`Initializing MCP server project: ${name || "mcp-server"}`);
  console.log("Options:", options);
}

// src/commands/create-plugin.ts
async function createPluginCommand(name, options = {}) {
  console.log(`Creating plugin: ${name}`);
  console.log("Options:", options);
}

// src/commands/add-tool.ts
async function addToolCommand(name, options = {}) {
  console.log(`Adding tool: ${name}`);
  console.log("Options:", options);
}
export {
  addToolCommand,
  createPluginCommand,
  initCommand
};
//# sourceMappingURL=index.mjs.map