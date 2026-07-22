import type { Extension } from "@codemirror/state";
import { spoilerLivePreviewExtension } from "./spoiler-detector";
import { subtextEditorPlugin } from "./subtext-live-preview";

export interface DiscordSyntaxSettings {
  enableSpoilers: boolean;
  enableSubtext: boolean;
  spoilerHiddenColor: string;
  spoilerRevealedColor: string;
  spoilerTextColor: string;
  spoilerRadius: number;
  spoilerPadding: number;
  subtextColor: string;
  subtextFontSize: number;
  subtextOpacity: number;
}

export const DEFAULT_SETTINGS: DiscordSyntaxSettings = {
  enableSpoilers: true,
  enableSubtext: true,
  spoilerHiddenColor: "var(--background-modifier-hover, #36393f)",
  spoilerRevealedColor: "var(--background-modifier-active-hover, #4f545c)",
  spoilerTextColor: "var(--text-normal, #dcddde)",
  spoilerRadius: 4,
  spoilerPadding: 4,
  subtextColor: "var(--text-muted, #72767d)",
  subtextFontSize: 12,
  subtextOpacity: 0.75,
};

export interface PropertyResolver {
  getPropertyValue(propName: string): string;
}

function isPropertyResolver(obj: unknown): obj is PropertyResolver {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "getPropertyValue" in obj &&
    typeof (obj as PropertyResolver).getPropertyValue === "function"
  );
}

function getPropertyResolver(
  targetEl?: HTMLElement | PropertyResolver | null,
): PropertyResolver | null {
  if (!targetEl) {
    if (
      typeof window !== "undefined" &&
      typeof window.getComputedStyle === "function"
    ) {
      const doc = window.document;
      const el = doc?.body ?? doc?.documentElement;
      if (el) {
        try {
          return window.getComputedStyle(el);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  if (isPropertyResolver(targetEl)) {
    return targetEl;
  }

  if (typeof targetEl === "object" && "ownerDocument" in targetEl) {
    const ownerDoc = targetEl.ownerDocument;
    const win =
      ownerDoc?.defaultView ?? (typeof window !== "undefined" ? window : null);
    if (win && typeof win.getComputedStyle === "function") {
      try {
        return win.getComputedStyle(targetEl);
      } catch {
        return null;
      }
    }
  }

  return null;
}

function parseVarExpression(
  expr: string,
): { varName: string; fallback?: string } | null {
  const trimmed = expr.trim();
  if (!trimmed.startsWith("var(") || !trimmed.endsWith(")")) {
    return null;
  }
  const inner = trimmed.slice(4, -1).trim();
  const firstComma = inner.indexOf(",");
  if (firstComma === -1) {
    const varName = inner.trim();
    if (/^--[a-zA-Z0-9_-]+$/.test(varName)) {
      return { varName };
    }
    return null;
  }
  const varName = inner.slice(0, firstComma).trim();
  const fallback = inner.slice(firstComma + 1).trim();
  if (/^--[a-zA-Z0-9_-]+$/.test(varName)) {
    return { varName, fallback };
  }
  return null;
}

function resolveVarExpression(
  expr: string,
  resolver: PropertyResolver | null,
  depth = 0,
): string {
  if (depth > 10) return expr;

  const parsed = parseVarExpression(expr);
  if (!parsed) {
    return expr.trim();
  }

  if (resolver) {
    const cssValue = resolver.getPropertyValue(parsed.varName).trim();
    if (cssValue) {
      return resolveVarExpression(cssValue, resolver, depth + 1);
    }
  }

  if (parsed.fallback !== undefined) {
    return resolveVarExpression(parsed.fallback, resolver, depth + 1);
  }

  return expr.trim();
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

function parseColorToHex(str: string): string | null {
  const trimmed = str.trim();

  const hex6 = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  if (hex6) {
    return `#${hex6[1].toLowerCase()}`;
  }

  const hex3 = trimmed.match(/^#([0-9a-fA-F]{3})$/);
  if (hex3) {
    const [, h] = hex3;
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)))
      .toString(16)
      .padStart(2, "0");
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)))
      .toString(16)
      .padStart(2, "0");
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)))
      .toString(16)
      .padStart(2, "0");
    return `#${r}${g}${b}`;
  }

  const hslMatch = trimmed.match(
    /^hsla?\(\s*(\d+(?:\.\d+)?)(?:deg)?\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/i,
  );
  if (hslMatch) {
    const h = ((parseFloat(hslMatch[1]) % 360) + 360) % 360;
    const s = Math.min(1, Math.max(0, parseFloat(hslMatch[2]) / 100));
    const l = Math.min(1, Math.max(0, parseFloat(hslMatch[3]) / 100));
    return hslToHex(h, s, l);
  }

  const hexInStr = trimmed.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (hexInStr) {
    const raw = hexInStr[0];
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
    }
    return raw.toLowerCase();
  }

  return null;
}

export function resolveColorToHex(
  colorStr: string,
  targetEl?: HTMLElement | PropertyResolver | null,
): string {
  if (!colorStr) return "#000000";

  const resolver = getPropertyResolver(targetEl);
  const resolvedExpr = resolveVarExpression(colorStr, resolver);
  const hex = parseColorToHex(resolvedExpr);

  return hex ?? "#000000";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeNumber(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return clamp(value, min, max);
}

function normalizeString(value: unknown, defaultValue: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return defaultValue;
  }
  return value.trim();
}

function normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value !== "boolean") {
    return defaultValue;
  }
  return value;
}

export function normalizeSettings(data: unknown): DiscordSyntaxSettings {
  if (!data || typeof data !== "object") {
    return { ...DEFAULT_SETTINGS };
  }

  const record = data as Record<string, unknown>;

  return {
    enableSpoilers: normalizeBoolean(
      record.enableSpoilers,
      DEFAULT_SETTINGS.enableSpoilers,
    ),
    enableSubtext: normalizeBoolean(
      record.enableSubtext,
      DEFAULT_SETTINGS.enableSubtext,
    ),
    spoilerHiddenColor: normalizeString(
      record.spoilerHiddenColor,
      DEFAULT_SETTINGS.spoilerHiddenColor,
    ),
    spoilerRevealedColor: normalizeString(
      record.spoilerRevealedColor,
      DEFAULT_SETTINGS.spoilerRevealedColor,
    ),
    spoilerTextColor: normalizeString(
      record.spoilerTextColor,
      DEFAULT_SETTINGS.spoilerTextColor,
    ),
    spoilerRadius: normalizeNumber(
      record.spoilerRadius,
      DEFAULT_SETTINGS.spoilerRadius,
      0,
      16,
    ),
    spoilerPadding: normalizeNumber(
      record.spoilerPadding,
      DEFAULT_SETTINGS.spoilerPadding,
      0,
      12,
    ),
    subtextColor: normalizeString(
      record.subtextColor,
      DEFAULT_SETTINGS.subtextColor,
    ),
    subtextFontSize: normalizeNumber(
      record.subtextFontSize,
      DEFAULT_SETTINGS.subtextFontSize,
      8,
      24,
    ),
    subtextOpacity: normalizeNumber(
      record.subtextOpacity,
      DEFAULT_SETTINGS.subtextOpacity,
      0.1,
      1,
    ),
  };
}

export function resetAppearanceSettings(
  settings: DiscordSyntaxSettings,
): DiscordSyntaxSettings {
  return {
    enableSpoilers: settings.enableSpoilers,
    enableSubtext: settings.enableSubtext,
    spoilerHiddenColor: DEFAULT_SETTINGS.spoilerHiddenColor,
    spoilerRevealedColor: DEFAULT_SETTINGS.spoilerRevealedColor,
    spoilerTextColor: DEFAULT_SETTINGS.spoilerTextColor,
    spoilerRadius: DEFAULT_SETTINGS.spoilerRadius,
    spoilerPadding: DEFAULT_SETTINGS.spoilerPadding,
    subtextColor: DEFAULT_SETTINGS.subtextColor,
    subtextFontSize: DEFAULT_SETTINGS.subtextFontSize,
    subtextOpacity: DEFAULT_SETTINGS.subtextOpacity,
  };
}

export function resetSingleAppearanceSetting(
  settings: DiscordSyntaxSettings,
  key: keyof DiscordSyntaxSettings,
): DiscordSyntaxSettings {
  if (key === "enableSpoilers" || key === "enableSubtext") {
    return { ...settings };
  }
  return {
    ...settings,
    [key]: DEFAULT_SETTINGS[key],
  };
}

export function getEnabledEditorExtensions(
  settings: DiscordSyntaxSettings,
): Extension[] {
  const extensions: Extension[] = [];
  if (settings.enableSubtext) {
    extensions.push(subtextEditorPlugin);
  }
  if (settings.enableSpoilers) {
    extensions.push(spoilerLivePreviewExtension);
  }
  return extensions;
}
