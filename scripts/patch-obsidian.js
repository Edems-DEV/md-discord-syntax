const fs = require("node:fs");
const path = require("node:path");

function patchObsidian(dir) {
  const pkgPath = path.join(dir, "node_modules/obsidian/package.json");
  if (!fs.existsSync(pkgPath)) {
    return false;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.main = "index.js";
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  const indexPath = path.join(dir, "node_modules/obsidian/index.js");
  fs.writeFileSync(indexPath, "module.exports = {};\n");
  return true;
}

function patchInstalledObsidian(rootDir = process.cwd()) {
  return [
    patchObsidian(rootDir),
    patchObsidian(path.join(rootDir, "packages/obsidian")),
  ].some(Boolean);
}

if (require.main === module) {
  patchInstalledObsidian();
}

module.exports = { patchInstalledObsidian, patchObsidian };
