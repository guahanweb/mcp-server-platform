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
  addToolCommand: () => addToolCommand,
  createPluginCommand: () => createPluginCommand,
  initCommand: () => initCommand
});
module.exports = __toCommonJS(index_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addToolCommand,
  createPluginCommand,
  initCommand
});
//# sourceMappingURL=index.js.map