import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_STYLES } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = path.resolve(__dirname, "..");
const srcCss = path.join(packageRoot, "styles.css");
const distDir = path.join(packageRoot, "dist");
const distCss = path.join(distDir, "styles.css");
const css = `${DEFAULT_STYLES}\n`;

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(srcCss, css);
fs.writeFileSync(distCss, css);
console.log("Successfully generated styles.css from DEFAULT_STYLES");
