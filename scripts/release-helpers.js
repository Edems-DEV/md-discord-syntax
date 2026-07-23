const { execFileSync } = require("node:child_process");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

const RELEASE_FILES = [
  "package-lock.json",
  "packages/obsidian/package.json",
  "manifest.json",
  "versions.json",
  "packages/obsidian/manifest.json",
  "packages/obsidian/versions.json",
  "examples/content/.obsidian/plugins/md-discord-syntax/main.js",
  "examples/content/.obsidian/plugins/md-discord-syntax/manifest.json",
  "examples/content/.obsidian/plugins/md-discord-syntax/styles.css",
];

function resolveInvocation(
  command,
  args,
  runtime = {
    execPath: process.execPath,
    npmExecPath: process.env.npm_execpath,
  },
) {
  if (command !== "npm") {
    return { command, args };
  }
  if (!runtime.npmExecPath) {
    throw new Error(
      "npm_execpath is unavailable; run this command through npm",
    );
  }
  return {
    command: runtime.execPath,
    args: [runtime.npmExecPath, ...args],
  };
}

function run(command, args, options = {}) {
  const invocation = resolveInvocation(command, args);
  return execFileSync(invocation.command, invocation.args, {
    cwd: rootDir,
    stdio: "inherit",
    ...options,
  });
}

function capture(command, args) {
  const invocation = resolveInvocation(command, args);
  return execFileSync(invocation.command, invocation.args, {
    cwd: rootDir,
    encoding: "utf8",
  }).trim();
}

function assertCleanWorkingTree() {
  const status = capture("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error(
      "Working tree is not clean. Commit or stash existing changes before releasing.",
    );
  }
}

function assertReleaseArtifactsClean() {
  const status = capture("git", [
    "status",
    "--porcelain",
    "--",
    ...RELEASE_FILES,
  ]);
  if (status) {
    throw new Error(
      `Release validation changed tracked artifacts unexpectedly:\n${status}`,
    );
  }
}

function validateRelease(label) {
  console.log(`\n🔍 ${label}...`);
  run("npm", ["run", "release:check"]);
}

function bumpVersion(version, bumpType) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Cannot bump invalid semver "${version}"`);
  }

  const parts = match.slice(1).map(Number);
  if (bumpType === "major") {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (bumpType === "minor") {
    parts[1] += 1;
    parts[2] = 0;
  } else if (bumpType === "patch") {
    parts[2] += 1;
  } else {
    throw new Error(`Unsupported version bump type "${bumpType}"`);
  }

  return parts.join(".");
}

function syncPackageLock() {
  console.log("🔒 Synchronizing package-lock.json...");
  run("npm", ["install", "--package-lock-only", "--ignore-scripts"]);
}

function stageReleaseFiles() {
  run("git", ["add", "--", ...RELEASE_FILES]);
}

function restoreReleaseFiles() {
  run("git", ["restore", "--staged", "--worktree", "--", ...RELEASE_FILES]);
}

function tagExists(tag) {
  try {
    execFileSync(
      "git",
      ["show-ref", "--verify", "--quiet", `refs/tags/${tag}`],
      {
        cwd: rootDir,
        stdio: "ignore",
      },
    );
    return true;
  } catch {
    // Continue with the remote check.
  }

  try {
    const output = capture("git", [
      "ls-remote",
      "--tags",
      "origin",
      `refs/tags/${tag}`,
    ]);
    return output.length > 0;
  } catch (error) {
    throw new Error(`Could not check remote tag "${tag}": ${error.message}`);
  }
}

function commitVersion(version) {
  stageReleaseFiles();
  run("git", ["commit", "-m", `🆕 obsidian ${version}`]);
}

function pushCurrentBranch() {
  const branch = capture("git", ["branch", "--show-current"]);
  if (!branch) {
    throw new Error("Cannot publish from a detached HEAD");
  }
  run("git", ["push", "origin", branch]);
}

function createAndPushTag(tag) {
  run("git", ["tag", tag]);
  try {
    run("git", ["push", "origin", tag]);
  } catch (error) {
    run("git", ["tag", "--delete", tag]);
    throw error;
  }
}

module.exports = {
  RELEASE_FILES,
  assertCleanWorkingTree,
  assertReleaseArtifactsClean,
  bumpVersion,
  commitVersion,
  createAndPushTag,
  pushCurrentBranch,
  resolveInvocation,
  restoreReleaseFiles,
  syncPackageLock,
  tagExists,
  validateRelease,
};
