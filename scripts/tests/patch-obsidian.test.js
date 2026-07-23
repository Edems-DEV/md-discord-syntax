const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { patchObsidian } = require("../patch-obsidian.js");

test("patchObsidian creates a headless CommonJS entry point", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-patch-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const packageDir = path.join(root, "node_modules", "obsidian");
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(
    path.join(packageDir, "package.json"),
    JSON.stringify({ name: "obsidian", types: "obsidian.d.ts" }),
  );

  assert.equal(patchObsidian(root), true);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf8"),
  );
  assert.equal(pkg.main, "index.js");
  assert.equal(
    fs.readFileSync(path.join(packageDir, "index.js"), "utf8"),
    "module.exports = {};\n",
  );
});

test("patchObsidian is a no-op when the package is absent", () => {
  assert.equal(
    patchObsidian(path.join(os.tmpdir(), "missing-obsidian")),
    false,
  );
});

test("patchObsidian fails when an installed package cannot be parsed", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-patch-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const packageDir = path.join(root, "node_modules", "obsidian");
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, "package.json"), "{not-json");

  assert.throws(() => patchObsidian(root), SyntaxError);
});
