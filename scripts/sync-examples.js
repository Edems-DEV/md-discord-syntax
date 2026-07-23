const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const obsidianSourceDir = path.join(rootDir, "packages", "obsidian");
const targetPluginDir = path.join(
  rootDir,
  "examples",
  "content",
  ".obsidian",
  "plugins",
  "md-discord-syntax",
);

if (!fs.existsSync(targetPluginDir)) {
  fs.mkdirSync(targetPluginDir, { recursive: true });
}

const filesToCopy = ["manifest.json", "main.js", "styles.css"];

for (const file of filesToCopy) {
  const src = path.join(obsidianSourceDir, file);
  const dest = path.join(targetPluginDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(
      `Synced ${file} -> examples/content/.obsidian/plugins/md-discord-syntax/${file}`,
    );
  } else {
    console.warn(`Warning: ${src} does not exist. Run obsidian build first.`);
  }
}

// Sync built packages to nextjs example node_modules if present
function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const nextjsNodeModules = path.join(
  rootDir,
  "examples",
  "nextjs",
  "node_modules",
  "@edems-dev",
);
if (fs.existsSync(nextjsNodeModules)) {
  const coreDist = path.join(rootDir, "packages", "core", "dist");
  const remarkDist = path.join(rootDir, "packages", "remark", "dist");
  copyDirRecursive(
    coreDist,
    path.join(nextjsNodeModules, "md-discord-syntax-core", "dist"),
  );
  copyDirRecursive(
    remarkDist,
    path.join(nextjsNodeModules, "remark-discord-syntax", "dist"),
  );
  console.log(
    "Synced packages/core and packages/remark build outputs to examples/nextjs/node_modules/@edems-dev",
  );
}

const quartzNodeModules = path.join(
  rootDir,
  "examples",
  "quartz",
  "node_modules",
  "@edems-dev",
);
if (fs.existsSync(quartzNodeModules)) {
  const quartzDist = path.join(rootDir, "packages", "quartz", "dist");
  copyDirRecursive(
    quartzDist,
    path.join(quartzNodeModules, "md-discord-syntax-quartz", "dist"),
  );
  console.log(
    "Synced packages/quartz build outputs to examples/quartz/node_modules/@edems-dev",
  );
}

