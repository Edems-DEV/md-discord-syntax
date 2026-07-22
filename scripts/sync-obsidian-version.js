const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

console.log("🔄 Synchronizing Obsidian plugin version from package.json...");

// 1. Read packages/obsidian/package.json
const obsidianPkgPath = path.join(rootDir, "packages", "obsidian", "package.json");
if (!fs.existsSync(obsidianPkgPath)) {
  console.error("❌ packages/obsidian/package.json not found!");
  process.exit(1);
}

const obsidianPkg = JSON.parse(fs.readFileSync(obsidianPkgPath, "utf8"));
const newVersion = obsidianPkg.version;

if (!newVersion) {
  console.error("❌ packages/obsidian/package.json does not have a valid version!");
  process.exit(1);
}

// 2. Update root manifest.json
const rootManifestPath = path.join(rootDir, "manifest.json");
let manifest = {};
if (fs.existsSync(rootManifestPath)) {
  manifest = JSON.parse(fs.readFileSync(rootManifestPath, "utf8"));
}

manifest.version = newVersion;
fs.writeFileSync(rootManifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`✅ Updated root manifest.json version -> ${newVersion}`);

// 3. Update root versions.json
const rootVersionsPath = path.join(rootDir, "versions.json");
let versions = {};
if (fs.existsSync(rootVersionsPath)) {
  versions = JSON.parse(fs.readFileSync(rootVersionsPath, "utf8"));
}

const minAppVersion = manifest.minAppVersion || "0.15.0";
if (!versions[newVersion]) {
  versions[newVersion] = minAppVersion;
  fs.writeFileSync(rootVersionsPath, JSON.stringify(versions, null, 2) + "\n");
  console.log(`✅ Added ${newVersion}: ${minAppVersion} to root versions.json`);
}

// 4. Synchronize to packages/obsidian/
const nestedManifestPath = path.join(rootDir, "packages", "obsidian", "manifest.json");
const nestedVersionsPath = path.join(rootDir, "packages", "obsidian", "versions.json");

fs.writeFileSync(nestedManifestPath, JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(nestedVersionsPath, JSON.stringify(versions, null, 2) + "\n");
console.log("✅ Synchronized manifest.json and versions.json to packages/obsidian/");
