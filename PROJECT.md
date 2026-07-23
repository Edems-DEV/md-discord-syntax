# Project: md-discord-syntax-quartz

## Architecture
`@edems-dev/md-discord-syntax-quartz` is a Quartz v4/v5 transformer adapter package located at `packages/quartz`.
It provides the factory function `DiscordSyntax(opts?: Options)` returning a `QuartzTransformerPluginInstance`.
It re-uses `@edems-dev/remark-discord-syntax` in its `markdownPlugins()` hook to avoid duplicating AST/parsing logic.
It injects default CSS via `externalResources()` when `enableDefaultStyles` is `true` (default), and exports `styles.css`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Package Setup & CSS | `packages/quartz/styles.css`, `packages/quartz/scripts/copy-styles.js`, `packages/quartz/package.json` | None | DONE |
| 2 | Transformer Adapter Implementation | `packages/quartz/src/index.ts` | M1 | DONE |
| 3 | Unit Testing & Verification | `packages/quartz/tests/index.test.ts` | M2 | DONE |
| 4 | Example Site Integration | `examples/quartz` configuration (`quartz.config.yaml` / `quartz.ts`) | M3 | DONE |
| 5 | Monorepo Verification & Audit | Root build, typecheck, test, and audit validation | M4 | DONE |

## Interface Contracts
### DiscordSyntax Plugin API
- Function: `DiscordSyntax(opts?: Options): QuartzTransformerPluginInstance`
- Options:
  ```ts
  export interface Options {
    enableDefaultStyles?: boolean;
  }
  ```
- Defaults: `{ enableDefaultStyles: true }`
- Return Object:
  - `name`: `"DiscordSyntax"`
  - `markdownPlugins`: `(_ctx?: unknown) => [remarkMdDiscordSyntax]`
  - `externalResources`: `(_ctx?: unknown) => { css: CSSResource[] } | undefined`
    - When `enableDefaultStyles` is `true` (or undefined): returns `{ css: [{ content: CSS_CONTENT, inline: true }] }` (or CSSResource).
    - When `enableDefaultStyles` is `false`: returns `{}` or `undefined`.

## Code Layout
- `packages/quartz/package.json`
- `packages/quartz/tsconfig.json`
- `packages/quartz/styles.css`
- `packages/quartz/scripts/copy-styles.js`
- `packages/quartz/src/index.ts`
- `packages/quartz/tests/index.test.ts`
- `examples/quartz/quartz.config.yaml` / `examples/quartz/quartz.ts`
