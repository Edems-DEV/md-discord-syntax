import Module, { createRequire, register } from "node:module";

register("./obsidian-test-loader.mjs", import.meta.url);

const require = createRequire(import.meta.url);
const obsidianMock = require("./obsidian-test-mock.cjs");
const originalLoad = Module._load;

Module._load = function loadWithObsidianMock(request, parent, isMain) {
  if (request === "obsidian") {
    return obsidianMock;
  }

  return originalLoad.call(this, request, parent, isMain);
};
