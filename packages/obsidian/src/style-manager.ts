import type { DiscordSyntaxSettings } from "./settings";

export const STYLE_VARIABLE_KEYS = [
  "--discord-spoiler-hidden-bg",
  "--discord-spoiler-revealed-bg",
  "--discord-spoiler-text-color",
  "--discord-spoiler-radius",
  "--discord-spoiler-padding",
  "--discord-subtext-color",
  "--discord-subtext-font-size",
  "--discord-subtext-opacity",
] as const;

export const STYLE_CLASS_NAME = "discord-syntax-enabled";

export function serializeStyleVariables(
  settings: DiscordSyntaxSettings,
): Record<string, string> {
  return {
    "--discord-spoiler-hidden-bg": settings.spoilerHiddenColor,
    "--discord-spoiler-revealed-bg": settings.spoilerRevealedColor,
    "--discord-spoiler-text-color": settings.spoilerTextColor,
    "--discord-spoiler-radius": `${settings.spoilerRadius}px`,
    "--discord-spoiler-padding": `${settings.spoilerPadding}px`,
    "--discord-subtext-color": settings.subtextColor,
    "--discord-subtext-font-size": `${settings.subtextFontSize}px`,
    "--discord-subtext-opacity": `${settings.subtextOpacity}`,
  };
}

export function applyStyleVariables(
  settings: DiscordSyntaxSettings,
  targetEl: HTMLElement,
): void {
  if (!targetEl || !targetEl.style) return;

  const vars = serializeStyleVariables(settings);
  for (const [key, val] of Object.entries(vars)) {
    targetEl.style.setProperty(key, val);
  }

  if (targetEl.classList) {
    targetEl.classList.add(STYLE_CLASS_NAME);
  }
}

export function removeStyleVariables(targetEl: HTMLElement): void {
  if (!targetEl || !targetEl.style) return;

  for (const key of STYLE_VARIABLE_KEYS) {
    targetEl.style.removeProperty(key);
  }

  if (targetEl.classList) {
    targetEl.classList.remove(STYLE_CLASS_NAME);
  }
}
