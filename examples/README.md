# Discord Syntax Examples & Test Environments

This directory contains test setups and demo environments for testing `md-discord-syntax` plugins and parsers.

---

## Folder Structure

```
examples/
├── content/              # Shared Markdown content with rendering edge cases
│   ├── .obsidian/        # Minimal Obsidian vault; the plugin is generated locally
│   └── test.md
├── nextjs/               # Minimal Next.js app testing @edems-dev/remark-discord-syntax
└── quartz/               # Reserved for future Quartz static site generator setup
```

---

## 1. Shared Test Note (`examples/content/test.md`)

`examples/content/test.md` contains comprehensive edge cases for both:

- **Spoiler Syntax (`||spoiler||`)**: Inline, nested bold/italic/code, adjacent spoilers, code blocks containing `||`, blockquotes, list items, and unmatched delimiters.
- **Subtext Syntax (`-# subtext`)**: Physical line starts, nested formatting, consecutive subtext lines, and distinguishing `-# ` from headers.

---

## 2. Obsidian Vault Example (`examples/content`)

### Setup & Usage:

1. Build the Obsidian plugin from the root repository:
   ```bash
   npm run build:obsidian
   ```
2. Open **Obsidian**.
3. Choose **"Open folder as vault"** and select `examples/content`.
4. Open `test.md` in both **Live Preview** and **Reading View** to verify spoiler masking, hover/reveal interactions, and subtext formatting.

The generated plugin directory under `.obsidian/plugins` is ignored by Git and recreated by the build command.

---

## 3. Next.js App Example (`examples/nextjs`)

### Setup & Usage:

1. Install dependencies & build core monorepo packages:
   ```bash
   npm run build
   ```
2. Navigate to `examples/nextjs` and start the dev server:
   ```bash
   cd examples/nextjs
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser to view `examples/content/test.md` rendered via `@edems-dev/remark-discord-syntax`.

---

## 4. Quartz Integration (Future Setup)

The `examples/content/` directory is structured to serve as Quartz's content root (`content/`) when `@edems-dev/md-discord-syntax-quartz` is implemented.
