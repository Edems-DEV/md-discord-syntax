const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const obsidianPkgPath = path.join(rootDir, "packages", "obsidian", "package.json");

console.log("🚀 Preparing Obsidian plugin release...");

// 1. Read Obsidian package version
if (!fs.existsSync(obsidianPkgPath)) {
  console.error("❌ packages/obsidian/package.json not found!");
  process.exit(1);
}

const obsidianPkg = JSON.parse(fs.readFileSync(obsidianPkgPath, "utf8"));
const version = obsidianPkg.version;

if (!version) {
  console.error("❌ packages/obsidian/package.json is missing version!");
  process.exit(1);
}

console.log(`📦 Target Obsidian Plugin Version: ${version}`);

// 2. Run full pre-release validation suite
try {
  console.log("\n🔍 Running release validation checks (build, test, validate)...");
  execSync("npm run release:check", { stdio: "inherit", cwd: rootDir });
} catch (err) {
  console.error("\n❌ Release check failed! Fix errors before publishing.");
  process.exit(1);
}

// 3. Check if tag already exists in local or remote git
let existingTags = "";
try {
  existingTags = execSync("git tag -l", { cwd: rootDir, encoding: "utf8" });
} catch (e) {
  // Ignore
}

const tag = version;
if (existingTags.split("\n").map(t => t.trim()).includes(tag)) {
  console.warn(`\n⚠️ Git tag "${tag}" already exists locally/remotely!`);
  console.warn(`💡 To publish a new release, bump the version in packages/obsidian/package.json (e.g. to ${version.replace(/\d+$/, (m) => parseInt(m, 10) + 1)}) or run "npm run version".`);
  process.exit(0);
}

// 4. Create tag & push to trigger GitHub release workflow
try {
  console.log(`\n🏷️ Creating git tag "${tag}"...`);
  execSync(`git tag ${tag}`, { stdio: "inherit", cwd: rootDir });
  console.log(`🚀 Pushing tag "${tag}" to GitHub...`);
  execSync(`git push origin ${tag}`, { stdio: "inherit", cwd: rootDir });
  console.log(`\n✨ Tag "${tag}" successfully pushed to GitHub!`);
  console.log("🎉 GitHub Actions will now build and publish the GitHub Release automatically.");
} catch (err) {
  console.error(`❌ Failed to create/push git tag: ${err.message}`);
  process.exit(1);
}
