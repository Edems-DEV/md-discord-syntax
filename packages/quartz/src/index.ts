import { remarkMdDiscordSyntax } from "@edems-dev/remark-discord-syntax";

export interface Options {
  enableDefaultStyles?: boolean;
}

export const DEFAULT_STYLES = `/* Discord Spoilers */
html body .discord-syntax-spoiler,
html body .discord-spoiler,
html body [data-spoiler="true"] {
  background-color: var(--discord-spoiler-hidden-bg, #2b2d31);
  color: transparent;
  -webkit-text-fill-color: transparent;
  cursor: pointer;
  user-select: none;
  border-radius: 3px;
  padding: 0 4px;
  transition: background-color 0.15s ease, color 0.15s ease;
  display: inline;
}

html body .discord-syntax-spoiler:not(.revealed):not(.is-revealed):not(:hover) *,
html body .discord-spoiler:not(.revealed):not(.is-revealed):not(:hover) *,
html body [data-spoiler="true"]:not(.revealed):not(.is-revealed):not(:hover) * {
  color: transparent;
  -webkit-text-fill-color: transparent;
  background-color: transparent;
  border: none;
  box-shadow: none;
  text-shadow: none;
}

html body .discord-syntax-spoiler:hover,
html body .discord-syntax-spoiler.revealed,
html body .discord-syntax-spoiler.is-revealed,
html body .discord-syntax-spoiler[data-revealed="true"],
html body .discord-spoiler:hover,
html body .discord-spoiler.revealed,
html body .discord-spoiler.is-revealed,
html body .discord-spoiler[data-revealed="true"],
html body [data-spoiler="true"]:hover,
html body [data-spoiler="true"].revealed,
html body [data-spoiler="true"].is-revealed {
  color: var(--dark, inherit);
  -webkit-text-fill-color: initial;
  background-color: var(--discord-spoiler-revealed-bg, rgba(255, 255, 255, 0.12));
}

html:root[saved-theme="light"] body .discord-syntax-spoiler.revealed,
html:root[saved-theme="light"] body .discord-syntax-spoiler.is-revealed,
html:root[saved-theme="light"] body .discord-syntax-spoiler:hover,
html:root[saved-theme="light"] body .discord-spoiler.revealed,
html:root[saved-theme="light"] body .discord-spoiler.is-revealed,
html:root[saved-theme="light"] body .discord-spoiler:hover,
html:root[saved-theme="light"] body [data-spoiler="true"].revealed,
html:root[saved-theme="light"] body [data-spoiler="true"].is-revealed,
html:root[saved-theme="light"] body [data-spoiler="true"]:hover {
  background-color: var(--discord-spoiler-revealed-bg, rgba(0, 0, 0, 0.08));
}

html body .discord-syntax-spoiler.revealed *,
html body .discord-syntax-spoiler.is-revealed *,
html body .discord-syntax-spoiler:hover *,
html body .discord-spoiler.revealed *,
html body .discord-spoiler.is-revealed *,
html body .discord-spoiler:hover *,
html body [data-spoiler="true"].revealed *,
html body [data-spoiler="true"].is-revealed *,
html body [data-spoiler="true"]:hover * {
  color: inherit;
  -webkit-text-fill-color: initial;
}

/* Discord Subtext */
html body .discord-syntax-subtext,
html body .discord-subtext,
html body [data-subtext="true"] {
  font-size: 0.82em;
  color: var(--gray, #72767d);
  display: inline;
}`;

export function DiscordSyntax(opts?: Options) {
  const enableDefaultStyles = opts?.enableDefaultStyles ?? true;
  return {
    name: "DiscordSyntax",
    markdownPlugins(): unknown[] {
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
