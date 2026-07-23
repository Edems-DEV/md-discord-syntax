import { remarkMdDiscordSyntax } from "@edems-dev/remark-discord-syntax";

export interface Options {
  enableDefaultStyles?: boolean;
}

export const DEFAULT_STYLES = `/* Discord Spoilers */
.discord-syntax-spoiler, .discord-spoiler, [data-spoiler="true"] {
  background-color: var(--discord-spoiler-hidden-bg, #2b2d31);
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  cursor: pointer;
  user-select: none;
  border-radius: 3px;
  padding: 0 4px;
  transition: background-color 0.15s ease, color 0.15s ease;
  display: inline;
}

.discord-syntax-spoiler:not(.revealed):not(.is-revealed):not(:hover) *,
.discord-spoiler:not(.revealed):not(.is-revealed):not(:hover) *,
[data-spoiler="true"]:not(.revealed):not(.is-revealed):not(:hover) * {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

.discord-syntax-spoiler:hover,
.discord-syntax-spoiler.revealed,
.discord-syntax-spoiler.is-revealed,
.discord-syntax-spoiler[data-revealed="true"],
.discord-spoiler:hover,
.discord-spoiler.revealed,
.discord-spoiler.is-revealed,
.discord-spoiler[data-revealed="true"],
[data-spoiler="true"]:hover,
[data-spoiler="true"].revealed,
[data-spoiler="true"].is-revealed {
  color: var(--dark, inherit) !important;
  -webkit-text-fill-color: initial !important;
  background-color: var(--discord-spoiler-revealed-bg, rgba(255, 255, 255, 0.12)) !important;
}

:root[saved-theme="light"] .discord-syntax-spoiler.revealed,
:root[saved-theme="light"] .discord-syntax-spoiler.is-revealed,
:root[saved-theme="light"] .discord-syntax-spoiler:hover,
:root[saved-theme="light"] .discord-spoiler.revealed,
:root[saved-theme="light"] .discord-spoiler.is-revealed,
:root[saved-theme="light"] .discord-spoiler:hover,
:root[saved-theme="light"] [data-spoiler="true"].revealed,
:root[saved-theme="light"] [data-spoiler="true"].is-revealed,
:root[saved-theme="light"] [data-spoiler="true"]:hover {
  background-color: var(--discord-spoiler-revealed-bg, rgba(0, 0, 0, 0.08)) !important;
}

.discord-syntax-spoiler.revealed *,
.discord-syntax-spoiler.is-revealed *,
.discord-syntax-spoiler:hover *,
.discord-spoiler.revealed *,
.discord-spoiler.is-revealed *,
.discord-spoiler:hover *,
[data-spoiler="true"].revealed *,
[data-spoiler="true"].is-revealed *,
[data-spoiler="true"]:hover * {
  color: inherit !important;
  -webkit-text-fill-color: initial !important;
}

/* Discord Subtext */
.discord-syntax-subtext, .discord-subtext, [data-subtext="true"] {
  font-size: 0.82em;
  color: var(--gray, #72767d);
  display: inline;
}`;

export function DiscordSyntax(opts?: Options) {
  const enableDefaultStyles = opts?.enableDefaultStyles ?? true;
  return {
    name: "DiscordSyntax",
    markdownPlugins() {
      return [remarkMdDiscordSyntax];
    },
    externalResources() {
      if (!enableDefaultStyles) {
        return {};
      }
      return {
        css: [
          {
            content: DEFAULT_STYLES,
            inline: true,
          },
        ],
      };
    },
  };
}

export default DiscordSyntax;
