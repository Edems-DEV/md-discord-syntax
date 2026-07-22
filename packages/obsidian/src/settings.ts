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
  spoilerHiddenColor: "#36393f",
  spoilerRevealedColor: "#4f545c",
  spoilerTextColor: "#dcddde",
  spoilerRadius: 4,
  spoilerPadding: 4,
  subtextColor: "#72767d",
  subtextFontSize: 12,
  subtextOpacity: 0.75,
};

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
