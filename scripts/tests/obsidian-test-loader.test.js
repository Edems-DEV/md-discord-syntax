const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

const rootDir = path.resolve(__dirname, "../..");
const registerPath = path.join(
  rootDir,
  "scripts",
  "register-obsidian-test-mock.mjs",
);

function runWithScopedMock(source) {
  const cleanDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-mock-"));
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      pathToFileURL(registerPath).href,
      "--input-type=module",
      "--eval",
      source,
    ],
    {
      cwd: cleanDir,
      encoding: "utf8",
    },
  );
  const createdNodeModules = fs.existsSync(path.join(cleanDir, "node_modules"));
  fs.rmSync(cleanDir, { recursive: true, force: true });

  return { createdNodeModules, result };
}

test("the scoped loader supplies the headless Obsidian ESM module", () => {
  const { createdNodeModules, result } = runWithScopedMock(
    'import { editorLivePreviewField } from "obsidian"; if (editorLivePreviewField !== undefined) process.exit(1);',
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(createdNodeModules, false);
});

test("the preload intercepts CommonJS require without an installed package", () => {
  const { createdNodeModules, result } = runWithScopedMock(`
    import { createRequire } from "node:module";
    const require = createRequire(import.meta.url);
    const first = require("obsidian");
    first.testMarker = true;
    const second = require("obsidian");
    if (second !== first || second.testMarker !== true) process.exit(1);
  `);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(createdNodeModules, false);
});
