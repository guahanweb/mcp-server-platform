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
  MCPErrorCode: () => MCPErrorCode
});
module.exports = __toCommonJS(index_exports);

// src/mcp.ts
var MCPErrorCode = /* @__PURE__ */ ((MCPErrorCode2) => {
  MCPErrorCode2[MCPErrorCode2["ParseError"] = -32700] = "ParseError";
  MCPErrorCode2[MCPErrorCode2["InvalidRequest"] = -32600] = "InvalidRequest";
  MCPErrorCode2[MCPErrorCode2["MethodNotFound"] = -32601] = "MethodNotFound";
  MCPErrorCode2[MCPErrorCode2["InvalidParams"] = -32602] = "InvalidParams";
  MCPErrorCode2[MCPErrorCode2["InternalError"] = -32603] = "InternalError";
  return MCPErrorCode2;
})(MCPErrorCode || {});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MCPErrorCode
});
//# sourceMappingURL=index.js.map