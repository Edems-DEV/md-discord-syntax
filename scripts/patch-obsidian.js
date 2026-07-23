import fs from "node:fs";
import path from "node:path";

function patchObsidian(dir) {
  const pkgPath = path.join(dir, "node_modules/obsidian/package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.main = "index.js";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      const indexPath = path.join(dir, "node_modules/obsidian/index.js");
      fs.writeFileSync(indexPath, "module.exports = {};\n");
    } catch (e) {
      console.warn("Failed to patch obsidian package at", dir, e);
    }
  }
}

patchObsidian(process.cwd());
patchObsidian(path.join(process.cwd(), "packages/obsidian"));
