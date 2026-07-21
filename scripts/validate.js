const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function exitWithError(msg) {
  console.error(`❌ VALIDATION FAILED: ${msg}`);
  process.exit(1);
}

console.log('🔍 Running regression validation checks...');

// 1. Check root manifest.json and versions.json existence
const rootManifestPath = path.join(rootDir, 'manifest.json');
const rootVersionsPath = path.join(rootDir, 'versions.json');

if (!fs.existsSync(rootManifestPath)) {
  exitWithError('root manifest.json is missing!');
}
if (!fs.existsSync(rootVersionsPath)) {
  exitWithError('root versions.json is missing!');
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));
} catch (e) {
  exitWithError(`Failed to parse root manifest.json: ${e.message}`);
}

let versions;
try {
  versions = JSON.parse(fs.readFileSync(rootVersionsPath, 'utf8'));
} catch (e) {
  exitWithError(`Failed to parse root versions.json: ${e.message}`);
}

// Ensure Obsidian plugin details
if (manifest.id !== 'md-discord-syntax') {
  exitWithError(`manifest.json id must be "md-discord-syntax", got "${manifest.id}"`);
}
if (manifest.name !== 'Discord Syntax') {
  exitWithError(`manifest.json name must be "Discord Syntax", got "${manifest.name}"`);
}
if (manifest.author !== 'Edems-DEV') {
  exitWithError(`manifest.json author must be "Edems-DEV", got "${manifest.author}"`);
}

// 2. Synchronize root manifest.json and versions.json to packages/obsidian/
const nestedManifestPath = path.join(rootDir, 'packages', 'obsidian', 'manifest.json');
const nestedVersionsPath = path.join(rootDir, 'packages', 'obsidian', 'versions.json');

try {
  fs.writeFileSync(nestedManifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log('✅ Synchronized root manifest.json to packages/obsidian/manifest.json');
  fs.writeFileSync(nestedVersionsPath, JSON.stringify(versions, null, 2) + '\n');
  console.log('✅ Synchronized root versions.json to packages/obsidian/versions.json');
} catch (e) {
  exitWithError(`Failed to synchronize manifest/versions files: ${e.message}`);
}

// 3. Validate packages/obsidian/package.json version matches manifest
const obsidianPkgPath = path.join(rootDir, 'packages', 'obsidian', 'package.json');
let obsidianPkg;
try {
  obsidianPkg = JSON.parse(fs.readFileSync(obsidianPkgPath, 'utf8'));
} catch (e) {
  exitWithError(`Failed to read/parse packages/obsidian/package.json: ${e.message}`);
}

if (obsidianPkg.version !== manifest.version) {
  exitWithError(`packages/obsidian/package.json version (${obsidianPkg.version}) does not match manifest.json version (${manifest.version})`);
}

// 4. Verify packages/obsidian/src/styles.css exists
const stylesSrcPath = path.join(rootDir, 'packages', 'obsidian', 'src', 'styles.css');
if (!fs.existsSync(stylesSrcPath)) {
  exitWithError(`packages/obsidian/src/styles.css is missing!`);
}

// 5. Check package metadata dependencies
const remarkPkgPath = path.join(rootDir, 'packages', 'remark', 'package.json');
let remarkPkg;
try {
  remarkPkg = JSON.parse(fs.readFileSync(remarkPkgPath, 'utf8'));
} catch (e) {
  exitWithError(`Failed to read/parse packages/remark/package.json: ${e.message}`);
}

const remarkCoreDep = remarkPkg.dependencies?.['@md-discord-syntax/core'];
if (!remarkCoreDep) {
  exitWithError(`remark-md-discord-syntax is missing dependency on "@md-discord-syntax/core"`);
}
if (remarkCoreDep.startsWith('file:')) {
  exitWithError(`remark-md-discord-syntax depends on local file spec for "@md-discord-syntax/core" ("${remarkCoreDep}"). Must use normal semver.`);
}

const obsidianCoreDep = obsidianPkg.dependencies?.['@md-discord-syntax/core'];
if (obsidianCoreDep && obsidianCoreDep.startsWith('file:')) {
  exitWithError(`md-discord-syntax-obsidian depends on local file spec for "@md-discord-syntax/core" ("${obsidianCoreDep}"). Must use normal semver.`);
}

// 6. Verify release assets existence and non-emptiness
const releaseAssets = [
  path.join(rootDir, 'packages', 'obsidian', 'main.js'),
  path.join(rootDir, 'packages', 'obsidian', 'manifest.json'),
  path.join(rootDir, 'packages', 'obsidian', 'styles.css')
];

for (const asset of releaseAssets) {
  if (!fs.existsSync(asset)) {
    exitWithError(`Missing required release asset: ${path.relative(rootDir, asset)}. Make sure to run the build first!`);
  }
  const stats = fs.statSync(asset);
  if (stats.size === 0) {
    exitWithError(`Release asset ${path.relative(rootDir, asset)} is empty!`);
  }
}

console.log('✨ All validation checks passed successfully!');
