# Discord Syntax Test Environments

The repository tracks only the shared Markdown fixture in `examples/content/test.md`. The Next.js and Quartz applications are disposable test instances: their directories are ignored by Git and can be recreated with the instructions below. This keeps unrelated framework source out of Obsidian's plugin review.

## 1. Shared test content

`examples/content/test.md` contains spoiler and subtext edge cases used by every test environment.

## 2. Obsidian test vault

From the repository root, run:

```bash
npm run build:obsidian
```

Open `examples/content` as an Obsidian vault, enable **Discord Syntax**, and inspect `test.md` in Live Preview and Reading View. The generated plugin under `.obsidian/plugins` is ignored by Git.

## 3. Next.js test instance

Requirements: Node.js 20.9 or newer and npm.

From the repository root, create an independent App Router project and install the local packages:

```bash
npx create-next-app@latest examples/nextjs --typescript --eslint --app --no-tailwind --no-src-dir --use-npm --yes
cd examples/nextjs
npm install --workspaces=false ../../packages/core ../../packages/remark remark remark-html
```

Replace `examples/nextjs/app/page.tsx` with:

```tsx
import fs from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { remarkMdDiscordSyntax } from "@edems-dev/remark-discord-syntax";

export default async function Page() {
  const markdown = await fs.readFile(
    path.join(process.cwd(), "..", "content", "test.md"),
    "utf8",
  );
  const rendered = await remark()
    .use(remarkMdDiscordSyntax)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);
  const html = rendered
    .toString()
    .replaceAll("<Spoiler>", '<span class="discord-syntax-spoiler">')
    .replaceAll("</Spoiler>", "</span>");

  return <article dangerouslySetInnerHTML={{ __html: html }} />;
}
```

Add the following minimal rules to `examples/nextjs/app/globals.css`:

```css
.discord-syntax-spoiler {
  background: #111214;
  color: transparent;
  border-radius: 3px;
  padding: 0 4px;
}

.discord-syntax-spoiler:hover {
  background: #404249;
  color: inherit;
}

[data-subtext="true"] {
  color: #949ba4;
  font-size: 0.75rem;
}
```

Start the site:

```bash
npm run dev
```

Open `http://localhost:3000`.

## 4. Quartz test instance

Requirements: Git, Node.js 22 or newer, and npm 10.9.2 or newer.

Build the local packages, then clone Quartz v5 into the ignored example directory:

```bash
npm run build
git clone --branch v5 --single-branch https://github.com/jackyzha0/quartz.git examples/quartz
cd examples/quartz
npm install
```

In `examples/quartz/quartz.config.yaml`, add this entry to `plugins`:

```yaml
plugins:
  - source: "../../packages/quartz"
    enabled: true
    options:
      enableDefaultStyles: true
    order: 45
```

Copy the shared fixture into the Quartz content directory and start the development server:

```bash
cp ../content/test.md content/test.md
npm run dev
```

On PowerShell, use `Copy-Item ..\content\test.md content\test.md` instead of `cp` if needed. Open the local URL printed by Quartz.

To reset either test instance, delete its ignored directory and repeat the corresponding section.
