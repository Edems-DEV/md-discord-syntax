import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageRoot = path.resolve(__dirname, '..');
const srcCss = path.join(packageRoot, 'styles.css');
const distDir = path.join(packageRoot, 'dist');
const distCss = path.join(distDir, 'styles.css');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.copyFileSync(srcCss, distCss);
console.log('Successfully copied styles.css to dist/styles.css');
