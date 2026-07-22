const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

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
    .find((a) => ["--patch", "--minor", "--major"].includes(a))
    ?.replace("--", "") || (args.includes("--auto") ? "patch" : null);

console.log("🚀 Preparing Obsidian plugin release...");

if (!fs.existsSync(obsidianPkgPath)) {
  console.error("❌ packages/obsidian/package.json not found!");
  process.exit(1);
}

let obsidianPkg = JSON.parse(fs.readFileSync(obsidianPkgPath, "utf8"));
let currentVersion = obsidianPkg.version || "1.0.0";

// Check if current tag exists locally or on remote
let existingTags = [];
try {
  const output = execSync("git tag -l", { cwd: rootDir, encoding: "utf8" });
  existingTags = output
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);
} catch (e) {
  // Ignore
}

const tagExists = existingTags.includes(currentVersion);

if (bumpType || tagExists) {
  const typeToUse = bumpType || "patch";
  const semverParts = currentVersion.split(".").map((n) => parseInt(n, 10));
  if (semverParts.length !== 3 || semverParts.some(isNaN)) {
    console.error(`❌ Cannot auto-bump invalid semver "${currentVersion}"`);
    process.exit(1);
  }

  if (typeToUse === "major") {
    semverParts[0] += 1;
    semverParts[1] = 0;
    semverParts[2] = 0;
  } else if (typeToUse === "minor") {
    semverParts[1] += 1;
    semverParts[2] = 0;
  } else {
    semverParts[2] += 1;
  }

  const nextVersion = semverParts.join(".");
  console.log(
    `⚡ Auto-bumping Obsidian version (${typeToUse}): ${currentVersion} -> ${nextVersion}`,
  );

  obsidianPkg.version = nextVersion;
  fs.writeFileSync(
    obsidianPkgPath,
    JSON.stringify(obsidianPkg, null, 2) + "\n",
  );

  console.log("🔄 Syncing version to manifest.json and versions.json...");
  execSync("npm run sync:versions", { stdio: "inherit", cwd: rootDir });

  console.log("📝 Committing version bump...");
  try {
    execSync(
      "git add packages/obsidian/package.json manifest.json versions.json packages/obsidian/manifest.json packages/obsidian/versions.json",
      { cwd: rootDir },
    );
    execSync(`git commit -m "🆕 obsidian ${nextVersion}"`, {
      stdio: "inherit",
      cwd: rootDir,
    });
    execSync("git push origin master", { stdio: "inherit", cwd: rootDir });
  } catch (err) {
    console.warn("⚠️ Git commit/push warning:", err.message);
  }

  currentVersion = nextVersion;
}

console.log(`📦 Target Obsidian Plugin Version: ${currentVersion}`);

// Run full pre-release validation suite
try {
  console.log(
    "\n🔍 Running release validation checks (build, test, validate)...",
  );
  execSync("npm run release:check", { stdio: "inherit", cwd: rootDir });
} catch (err) {
  console.error("\n❌ Release check failed! Fix errors before publishing.");
  process.exit(1);
}

const tag = currentVersion;
// Create tag & push to trigger GitHub release workflow
try {
  console.log(`\n🏷️ Creating git tag "${tag}"...`);
  execSync(`git tag ${tag}`, { stdio: "inherit", cwd: rootDir });
  console.log(`🚀 Pushing tag "${tag}" to GitHub...`);
  execSync(`git push origin ${tag}`, { stdio: "inherit", cwd: rootDir });
  console.log(`\n✨ Tag "${tag}" successfully pushed to GitHub!`);
  console.log(
    "🎉 GitHub Actions will now build and publish the GitHub Release automatically.",
  );
  console.log(
    'Your package is being built, after release check for new release at "https://community.obsidian.md/account/plugins/md-discord-syntax"',
  );
} catch (err) {
  console.error(`❌ Failed to create/push git tag: ${err.message}`);
  process.exit(1);
}
