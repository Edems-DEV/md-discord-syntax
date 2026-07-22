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
    ?.replace("--", "") || "patch";

if (!fs.existsSync(obsidianPkgPath)) {
  console.error("❌ packages/obsidian/package.json not found!");
  process.exit(1);
}

const obsidianPkg = JSON.parse(fs.readFileSync(obsidianPkgPath, "utf8"));
const currentVersion = obsidianPkg.version || "1.0.0";

const semverParts = currentVersion.split(".").map((n) => parseInt(n, 10));
if (semverParts.length !== 3 || semverParts.some(isNaN)) {
  console.error(`❌ Cannot bump invalid semver "${currentVersion}"`);
  process.exit(1);
}

if (bumpType === "major") {
  semverParts[0] += 1;
  semverParts[1] = 0;
  semverParts[2] = 0;
} else if (bumpType === "minor") {
  semverParts[1] += 1;
  semverParts[2] = 0;
} else {
  semverParts[2] += 1;
}

const nextVersion = semverParts.join(".");
console.log(
  `⚡ Bumping Obsidian plugin version (${bumpType}): ${currentVersion} -> ${nextVersion}`,
);

obsidianPkg.version = nextVersion;
fs.writeFileSync(obsidianPkgPath, JSON.stringify(obsidianPkg, null, 2) + "\n");

console.log("🔄 Syncing version to manifest.json and versions.json...");
execSync("npm run sync:versions", { stdio: "inherit", cwd: rootDir });

console.log("📝 Creating bump commit...");
try {
  execSync(
    "git add packages/obsidian/package.json manifest.json versions.json packages/obsidian/manifest.json packages/obsidian/versions.json",
    { cwd: rootDir },
  );
  execSync(`git commit -m "🆕 obsidian ${nextVersion}"`, {
    stdio: "inherit",
    cwd: rootDir,
  });
  console.log(
    `\n✨ Successfully bumped and created commit: "🆕 obsidian ${nextVersion}"`,
  );
} catch (err) {
  console.error(`❌ Failed to create bump commit: ${err.message}`);
  process.exit(1);
}
