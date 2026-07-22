const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function exitWithError(msg) {
  console.error(`❌ VALIDATION FAILED: ${msg}`);
  process.exit(1);
}

console.log("🔍 Running regression validation checks...");

// 1. Check root manifest.json and versions.json existence
const rootManifestPath = path.join(rootDir, "manifest.json");
const rootVersionsPath = path.join(rootDir, "versions.json");

if (!fs.existsSync(rootManifestPath)) {
  exitWithError("root manifest.json is missing!");
}
if (!fs.existsSync(rootVersionsPath)) {
  exitWithError("root versions.json is missing!");
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(rootManifestPath, "utf8"));
} catch (e) {
  exitWithError(`Failed to parse root manifest.json: ${e.message}`);
}

let versions;
try {
  versions = JSON.parse(fs.readFileSync(rootVersionsPath, "utf8"));
} catch (e) {
  exitWithError(`Failed to parse root versions.json: ${e.message}`);
}

// Ensure Obsidian plugin details
if (manifest.id !== "md-discord-syntax") {
  exitWithError(
    `manifest.json id must be "md-discord-syntax", got "${manifest.id}"`,
  );
}
if (manifest.name !== "Discord Syntax") {
  exitWithError(
    `manifest.json name must be "Discord Syntax", got "${manifest.name}"`,
  );
}
if (manifest.author !== "Edems-DEV") {
  exitWithError(
    `manifest.json author must be "Edems-DEV", got "${manifest.author}"`,
  );
}
if (
  typeof manifest.description !== "string" ||
  /\bobsidian\b/i.test(manifest.description) ||
  !/[.!?]$/.test(manifest.description)
) {
  exitWithError(
    'manifest.json description must omit "Obsidian" and end with punctuation',
  );
}

// 2. Synchronize root manifest.json and versions.json to packages/obsidian/
const nestedManifestPath = path.join(
  rootDir,
  "packages",
  "obsidian",
  "manifest.json",
);
const nestedVersionsPath = path.join(
  rootDir,
  "packages",
  "obsidian",
  "versions.json",
);

try {
  fs.writeFileSync(
    nestedManifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(
    "✅ Synchronized root manifest.json to packages/obsidian/manifest.json",
  );
  fs.writeFileSync(
    nestedVersionsPath,
    JSON.stringify(versions, null, 2) + "\n",
  );
  console.log(
    "✅ Synchronized root versions.json to packages/obsidian/versions.json",
  );
} catch (e) {
  exitWithError(`Failed to synchronize manifest/versions files: ${e.message}`);
}

// 3. Validate packages/obsidian/package.json version matches manifest
const obsidianPkgPath = path.join(
  rootDir,
  "packages",
  "obsidian",
  "package.json",
);
let obsidianPkg;
try {
  obsidianPkg = JSON.parse(fs.readFileSync(obsidianPkgPath, "utf8"));
} catch (e) {
  exitWithError(
    `Failed to read/parse packages/obsidian/package.json: ${e.message}`,
  );
}

if (obsidianPkg.name !== "md-discord-syntax") {
  exitWithError(
    `packages/obsidian/package.json name must be "md-discord-syntax", got "${obsidianPkg.name}"`,
  );
}

if (obsidianPkg.version !== manifest.version) {
  exitWithError(
    `packages/obsidian/package.json version (${obsidianPkg.version}) does not match manifest.json version (${manifest.version})`,
  );
}

// 4. Verify packages/obsidian/src/styles.css exists
const stylesSrcPath = path.join(
  rootDir,
  "packages",
  "obsidian",
  "src",
  "styles.css",
);
if (!fs.existsSync(stylesSrcPath)) {
  exitWithError(`packages/obsidian/src/styles.css is missing!`);
}

// 5. Check package metadata dependencies & publish tarball configuration
const corePkgPath = path.join(rootDir, "packages", "core", "package.json");
let corePkg;
try {
  corePkg = JSON.parse(fs.readFileSync(corePkgPath, "utf8"));
} catch (e) {
  exitWithError(
    `Failed to read/parse packages/core/package.json: ${e.message}`,
  );
}

if (corePkg.name !== "@edems-dev/md-discord-syntax-core") {
  exitWithError(
    `packages/core/package.json name must be "@edems-dev/md-discord-syntax-core", got "${corePkg.name}"`,
  );
}

const remarkPkgPath = path.join(rootDir, "packages", "remark", "package.json");
let remarkPkg;
try {
  remarkPkg = JSON.parse(fs.readFileSync(remarkPkgPath, "utf8"));
} catch (e) {
  exitWithError(
    `Failed to read/parse packages/remark/package.json: ${e.message}`,
  );
}

if (remarkPkg.name !== "@edems-dev/remark-discord-syntax") {
  exitWithError(
    `packages/remark/package.json name must be "@edems-dev/remark-discord-syntax", got "${remarkPkg.name}"`,
  );
}

if (remarkPkg.dependencies?.["@md-discord-syntax/core"]) {
  exitWithError(
    `@edems-dev/remark-discord-syntax still has reference to old scope "@md-discord-syntax/core"`,
  );
}

const remarkCoreDep =
  remarkPkg.dependencies?.["@edems-dev/md-discord-syntax-core"];
if (!remarkCoreDep) {
  exitWithError(
    `@edems-dev/remark-discord-syntax is missing dependency on "@edems-dev/md-discord-syntax-core"`,
  );
}
if (remarkCoreDep.startsWith("file:")) {
  exitWithError(
    `@edems-dev/remark-discord-syntax depends on local file spec for "@edems-dev/md-discord-syntax-core" ("${remarkCoreDep}"). Must use normal semver.`,
  );
}

if (obsidianPkg.dependencies?.["@md-discord-syntax/core"]) {
  exitWithError(
    `discord-syntax still has reference to old scope "@md-discord-syntax/core"`,
  );
}

const obsidianCoreDep =
  obsidianPkg.dependencies?.["@edems-dev/md-discord-syntax-core"];
if (obsidianCoreDep && obsidianCoreDep.startsWith("file:")) {
  exitWithError(
    `discord-syntax depends on local file spec for "@edems-dev/md-discord-syntax-core" ("${obsidianCoreDep}"). Must use normal semver.`,
  );
}

// Ensure published npm packages (core & remark) configure tarballs & safe prepack
for (const pkgName of ["core", "remark"]) {
  const pkgJsonPath = path.join(rootDir, "packages", pkgName, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));

  if (!Array.isArray(pkg.files) || !pkg.files.includes("dist")) {
    exitWithError(
      `packages/${pkgName}/package.json "files" array must include "dist"`,
    );
  }

  if (!pkg.scripts?.prepack) {
    exitWithError(
      `packages/${pkgName}/package.json is missing safe "prepack" script`,
    );
  }

  // Ensure entrypoints exist in dist
  const distJsPath = path.join(
    rootDir,
    "packages",
    pkgName,
    "dist",
    "index.js",
  );
  const distDtsPath = path.join(
    rootDir,
    "packages",
    pkgName,
    "dist",
    "index.d.ts",
  );
  if (!fs.existsSync(distJsPath)) {
    exitWithError(
      `packages/${pkgName}/dist/index.js is missing! Make sure to run build first.`,
    );
  }
  if (!fs.existsSync(distDtsPath)) {
    exitWithError(
      `packages/${pkgName}/dist/index.d.ts is missing! Make sure to run build first.`,
    );
  }
}

// 6. Verify release assets existence and non-emptiness
const releaseAssets = [
  path.join(rootDir, "packages", "obsidian", "main.js"),
  path.join(rootDir, "packages", "obsidian", "manifest.json"),
  path.join(rootDir, "packages", "obsidian", "styles.css"),
];

for (const asset of releaseAssets) {
  if (!fs.existsSync(asset)) {
    exitWithError(
      `Missing required release asset: ${path.relative(rootDir, asset)}. Make sure to run the build first!`,
    );
  }
  const stats = fs.statSync(asset);
  if (stats.size === 0) {
    exitWithError(`Release asset ${path.relative(rootDir, asset)} is empty!`);
  }
}

// 7. Obsidian Plugin Reviewer / Scanner Compliance Checks
console.log("🔍 Checking Obsidian Plugin Scanner Rules...");
const obsidianSrcDir = path.join(rootDir, "packages", "obsidian", "src");
const obsidianSrcFiles = fs
  .readdirSync(obsidianSrcDir)
  .filter((f) => f.endsWith(".ts"));

for (const file of obsidianSrcFiles) {
  const filePath = path.join(obsidianSrcDir, file);
  const content = fs.readFileSync(filePath, "utf8");

  // 7a. Check forbidden require() in src/
  if (/require\s*\(/.test(content)) {
    exitWithError(
      `Forbidden require() found in packages/obsidian/src/${file}. Use ESM imports instead.`,
    );
  }

  // 7b. Check static fs / path Node imports in src/
  if (/import\s+.*from\s+["'](?:node:)?(?:fs|path)["']/.test(content)) {
    exitWithError(
      `Forbidden Node fs/path import found in packages/obsidian/src/${file}. Mobile unavailable!`,
    );
  }

  // 7c. Check document.createElement in src/
  if (/\bdocument\.createElement\b/.test(content)) {
    exitWithError(
      `Forbidden document.createElement found in packages/obsidian/src/${file}. Use createEl/createSpan instead.`,
    );
  }

  // 7d. Check querySelector / querySelectorAll in src/
  if (/\.(?:querySelector|querySelectorAll)\s*\(/.test(content)) {
    exitWithError(
      `Deprecated querySelector/querySelectorAll found in packages/obsidian/src/${file}. Use find/findAll instead.`,
    );
  }
}

// 7e. Check main.js bundle for scanner violations
const mainJsPath = path.join(rootDir, "packages", "obsidian", "main.js");
if (fs.existsSync(mainJsPath)) {
  const mainJsContent = fs.readFileSync(mainJsPath, "utf8");

  // Verify querySelector / querySelectorAll is not present in plugin code inside main.js
  if (/\.(?:querySelector|querySelectorAll)\s*\(/.test(mainJsContent)) {
    exitWithError(
      "Deprecated querySelector/querySelectorAll found in packages/obsidian/main.js!",
    );
  }

  // Verify document.createElement is not present in main.js
  if (/\bdocument\.createElement\b/.test(mainJsContent)) {
    exitWithError(
      "Forbidden document.createElement found in packages/obsidian/main.js!",
    );
  }
}

// 7f. Check styles.css compatibility
const stylesCssPath = path.join(
  rootDir,
  "packages",
  "obsidian",
  "src",
  "styles.css",
);
if (fs.existsSync(stylesCssPath)) {
  const cssContent = fs.readFileSync(stylesCssPath, "utf8");
  if (/:has\s*\(/.test(cssContent)) {
    exitWithError(
      "Incompatible CSS selector :has() found in packages/obsidian/src/styles.css!",
    );
  }
  if (/!important/.test(cssContent)) {
    exitWithError(
      "Forbidden !important flag found in packages/obsidian/src/styles.css!",
    );
  }
}

console.log("✨ All validation & scanner checks passed successfully!");
