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
