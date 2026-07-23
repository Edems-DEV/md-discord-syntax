const assert = require("node:assert/strict");
const test = require("node:test");

const {
  RELEASE_FILES,
  bumpVersion,
  resolveInvocation,
} = require("../release-helpers.js");

test("bumpVersion increments valid semantic versions", () => {
  assert.equal(bumpVersion("1.2.3", "patch"), "1.2.4");
  assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
  assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
});

test("bumpVersion rejects unsupported or invalid input", () => {
  assert.throws(() => bumpVersion("1.2", "patch"), /invalid semver/);
  assert.throws(() => bumpVersion("1.2.3", "banana"), /Unsupported/);
});

test("release commits include generated examples and lock metadata", () => {
  assert.ok(RELEASE_FILES.includes("package-lock.json"));
  assert.ok(
    RELEASE_FILES.includes(
      "examples/content/.obsidian/plugins/md-discord-syntax/main.js",
    ),
  );
  assert.ok(
    RELEASE_FILES.includes(
      "examples/content/.obsidian/plugins/md-discord-syntax/manifest.json",
    ),
  );
  assert.ok(
    RELEASE_FILES.includes(
      "examples/content/.obsidian/plugins/md-discord-syntax/styles.css",
    ),
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
