const fs = require("node:fs");
const path = require("node:path");
const {
  assertCleanWorkingTree,
  bumpVersion,
  commitVersion,
  createAndPushTag,
  pushCurrentBranch,
  restoreReleaseFiles,
  syncPackageLock,
  tagExists,
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
const requestedBump = args
  .find((arg) => ["--patch", "--minor", "--major"].includes(arg))
  ?.slice(2);
const autoBump = args.includes("--auto") ? "patch" : null;

function readPackage() {
  if (!fs.existsSync(obsidianPkgPath)) {
    throw new Error("packages/obsidian/package.json not found");
  }
  return JSON.parse(fs.readFileSync(obsidianPkgPath, "utf8"));
}

console.log("🚀 Preparing Obsidian plugin release...");

let releaseFilesMayHaveChanged = false;
let releaseCommitCreated = false;

try {
  assertCleanWorkingTree();
  releaseFilesMayHaveChanged = true;

  let obsidianPkg = readPackage();
  let currentVersion = obsidianPkg.version;
  const currentTagExists = tagExists(currentVersion);
  const bumpType =
    requestedBump ?? autoBump ?? (currentTagExists ? "patch" : null);

  validateRelease("Validating current release state");
  assertCleanWorkingTree();

  if (bumpType) {
    const nextVersion = bumpVersion(currentVersion, bumpType);
    if (tagExists(nextVersion)) {
      throw new Error(
        `Target tag "${nextVersion}" already exists; choose another version bump`,
      );
    }

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
    pushCurrentBranch();
    currentVersion = nextVersion;
  }

  console.log(`\n🏷️ Creating git tag "${currentVersion}"...`);
  createAndPushTag(currentVersion);
  console.log(`\n✨ Tag "${currentVersion}" successfully pushed to GitHub!`);
  console.log(
    "🎉 GitHub Actions will now build and publish the GitHub Release automatically.",
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
  console.error(`\n❌ Obsidian release failed: ${error.message}`);
  process.exit(1);
}
