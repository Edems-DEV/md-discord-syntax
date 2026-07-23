const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_FILES,
  bumpVersion,
  resolveInvocation,
} = require("../release-helpers.js");
const packageLock = require("../../package-lock.json");

test("bumpVersion increments valid semantic versions", () => {
  assert.equal(bumpVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
});

test("bumpVersion rejects unsupported or invalid input", () => {
  assert.throws(() => bumpVersion("1.2", "patch"), /invalid semver/);
  assert.throws(() => bumpVersion("1.2.3", "banana"), /Unsupported/);
});

test("release commits include lock metadata but exclude generated examples", () => {
  assert.ok(RELEASE_FILES.includes("package-lock.json"));
  assert.equal(
    RELEASE_FILES.some((file) =>
      file.startsWith(
        "examples/content/.obsidian/plugins/md-discord-syntax/",
      ),
    ),
    false,
  );
});

test("package lock includes the Rollup Linux binary used by CI", () => {
  assert.ok(
    packageLock.packages["node_modules/@rollup/rollup-linux-x64-gnu"],
  );
});

test("resolveInvocation runs npm through its JavaScript CLI", () => {
  assert.deepEqual(
    resolveInvocation("npm", ["run", "test"], {
      execPath: "node.exe",
      npmExecPath: "npm-cli.js",
    }),
    {
      command: "node.exe",
      args: ["npm-cli.js", "run", "test"],
    },
  );
  assert.deepEqual(resolveInvocation("git", ["status"]), {
    command: "git",
    args: ["status"],
  });
});

test("resolveInvocation switches from Bun to npm's JavaScript CLI", () => {
  assert.deepEqual(
    resolveInvocation("npm", ["run", "release:check"], {
      execPath: "node.exe",
      npmExecPath: "C:\\Users\\root\\.bun\\bin\\bun.exe",
      npmCliPath: "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
    }),
    {
      command: "node.exe",
      args: [
        "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js",
        "run",
        "release:check",
      ],
    },
  );
});

test("resolveInvocation rejects npm without an npm CLI path", () => {
  assert.throws(
    () =>
      resolveInvocation("npm", ["run", "test"], {
        execPath: "node",
        npmExecPath: undefined,
      }),
    /npm_execpath is unavailable/,
  );
});
