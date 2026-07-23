const fs = require("node:fs");
const path = require("node:path");
const {
  assertCleanWorkingTree,
  assertReleaseArtifactsClean,
  bumpVersion,
  commitVersion,
  restoreReleaseFiles,
  syncPackageLock,
  validateRelease,
} = require("./release-helpers.js");

const rootDir = path.resolve(__dirname, "..");
const obsidianPkgPath = path.join(
  rootDir,
  "packages",
  "obsidian",
  "package.json",
);

const args = process.argv.slice(2);
const bumpType =
  args
    .find((arg) => ["--patch", "--minor", "--major"].includes(arg))
    ?.slice(2) ?? "patch";

function readPackage() {
  if (!fs.existsSync(obsidianPkgPath)) {
    throw new Error("packages/obsidian/package.json not found");
  }
  return JSON.parse(fs.readFileSync(obsidianPkgPath, "utf8"));
}

let releaseFilesMayHaveChanged = false;
let releaseCommitCreated = false;

try {
  assertCleanWorkingTree();
  releaseFilesMayHaveChanged = true;

  validateRelease("Validating current release state");
  assertReleaseArtifactsClean();

  const obsidianPkg = readPackage();
  const currentVersion = obsidianPkg.version;
  const nextVersion = bumpVersion(currentVersion, bumpType);

  console.log(
    `⚡ Bumping Obsidian plugin version (${bumpType}): ${currentVersion} -> ${nextVersion}`,
  );
  obsidianPkg.version = nextVersion;
  fs.writeFileSync(
    obsidianPkgPath,
    `${JSON.stringify(obsidianPkg, null, 2)}\n`,
  );

  syncPackageLock();
  validateRelease("Validating final release state");
  commitVersion(nextVersion);
  releaseCommitCreated = true;

  console.log(
    `\n✨ Successfully created release commit "🆕 obsidian ${nextVersion}"`,
  );
} catch (error) {
  if (releaseFilesMayHaveChanged && !releaseCommitCreated) {
    try {
      restoreReleaseFiles();
    } catch (restoreError) {
      console.error(
        `❌ Could not restore release files: ${restoreError.message}`,
      );
    }
  }
  console.error(`\n❌ Obsidian version bump failed: ${error.message}`);
  process.exit(1);
}
