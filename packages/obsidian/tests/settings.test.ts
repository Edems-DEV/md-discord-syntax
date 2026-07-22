import test from "node:test";
import assert from "node:assert";
import {
  DEFAULT_SETTINGS,
  DiscordSyntaxSettings,
  PropertyResolver,
  normalizeSettings,
  resetAppearanceSettings,
  resetSingleAppearanceSetting,
  resolveColorToHex,
  getEnabledEditorExtensions,
} from "../src/settings.js";
import {
  serializeStyleVariables,
  applyStyleVariables,
  removeStyleVariables,
  STYLE_VARIABLE_KEYS,
  STYLE_CLASS_NAME,
} from "../src/style-manager.js";
import { spoilerLivePreviewExtension } from "../src/spoiler-detector.js";
import { subtextEditorPlugin } from "../src/subtext-live-preview.js";

void test("Settings Normalization & Defaults", async (t) => {
  await t.test("returns defaults for undefined or empty data", () => {
    const s1 = normalizeSettings(undefined);
    assert.deepStrictEqual(s1, DEFAULT_SETTINGS);

    const s2 = normalizeSettings({});
    assert.deepStrictEqual(s2, DEFAULT_SETTINGS);
  });

  await t.test("preserves valid partial data and merges defaults", () => {
    const input = {
      enableSpoilers: false,
      spoilerRadius: 10,
      spoilerHiddenColor: "#123456",
    };
    const s = normalizeSettings(input);
    assert.strictEqual(s.enableSpoilers, false);
    assert.strictEqual(s.enableSubtext, true);
    assert.strictEqual(s.spoilerRadius, 10);
    assert.strictEqual(s.spoilerHiddenColor, "#123456");
    assert.strictEqual(s.spoilerPadding, DEFAULT_SETTINGS.spoilerPadding);
  });

  await t.test("clamps out of bounds numeric values", () => {
    const input = {
      spoilerRadius: 25,
      spoilerPadding: -5,
      subtextFontSize: 100,
      subtextOpacity: 0,
    };
    const s = normalizeSettings(input);
    assert.strictEqual(s.spoilerRadius, 16);
    assert.strictEqual(s.spoilerPadding, 0);
    assert.strictEqual(s.subtextFontSize, 24);
    assert.strictEqual(s.subtextOpacity, 0.1);
  });

  await t.test("handles non-finite, NaN, and invalid types", () => {
    const input = {
      enableSpoilers: "invalid",
      spoilerRadius: NaN,
      spoilerPadding: Infinity,
      spoilerHiddenColor: "   ",
    };
    const s = normalizeSettings(input);
    assert.strictEqual(s.enableSpoilers, DEFAULT_SETTINGS.enableSpoilers);
    assert.strictEqual(s.spoilerRadius, DEFAULT_SETTINGS.spoilerRadius);
    assert.strictEqual(s.spoilerPadding, DEFAULT_SETTINGS.spoilerPadding);
    assert.strictEqual(
      s.spoilerHiddenColor,
      DEFAULT_SETTINGS.spoilerHiddenColor,
    );
  });
});

void test("Appearance Reset Helper", async (t) => {
  await t.test(
    "resets appearance fields while preserving syntax toggles",
    () => {
      const customSettings = {
        enableSpoilers: false,
        enableSubtext: false,
        spoilerHiddenColor: "#000000",
        spoilerRevealedColor: "#ffffff",
        spoilerTextColor: "#red000",
        spoilerRadius: 12,
        spoilerPadding: 8,
        subtextColor: "#blue00",
        subtextFontSize: 18,
        subtextOpacity: 0.3,
      };

      const reset = resetAppearanceSettings(customSettings);
      assert.strictEqual(reset.enableSpoilers, false);
      assert.strictEqual(reset.enableSubtext, false);
      assert.strictEqual(
        reset.spoilerHiddenColor,
        DEFAULT_SETTINGS.spoilerHiddenColor,
      );
      assert.strictEqual(
        reset.spoilerRevealedColor,
        DEFAULT_SETTINGS.spoilerRevealedColor,
      );
      assert.strictEqual(
        reset.spoilerTextColor,
        DEFAULT_SETTINGS.spoilerTextColor,
      );
      assert.strictEqual(reset.spoilerRadius, DEFAULT_SETTINGS.spoilerRadius);
      assert.strictEqual(reset.spoilerPadding, DEFAULT_SETTINGS.spoilerPadding);
      assert.strictEqual(reset.subtextColor, DEFAULT_SETTINGS.subtextColor);
      assert.strictEqual(
        reset.subtextFontSize,
        DEFAULT_SETTINGS.subtextFontSize,
      );
      assert.strictEqual(reset.subtextOpacity, DEFAULT_SETTINGS.subtextOpacity);
    },
  );
});

void test("Individual Field Reset Helper", async (t) => {
  const customSettings: DiscordSyntaxSettings = {
    enableSpoilers: false,
    enableSubtext: false,
    spoilerHiddenColor: "#111111",
    spoilerRevealedColor: "#222222",
    spoilerTextColor: "#333333",
    spoilerRadius: 10,
    spoilerPadding: 8,
    subtextColor: "#444444",
    subtextFontSize: 18,
    subtextOpacity: 0.5,
  };

  const appearanceKeys: (keyof DiscordSyntaxSettings)[] = [
    "spoilerHiddenColor",
    "spoilerRevealedColor",
    "spoilerTextColor",
    "spoilerRadius",
    "spoilerPadding",
    "subtextColor",
    "subtextFontSize",
    "subtextOpacity",
  ];

  for (const targetKey of appearanceKeys) {
    await t.test(
      `resets only ${targetKey} leaving all other fields untouched`,
      () => {
        const resetResult = resetSingleAppearanceSetting(
          customSettings,
          targetKey,
        );

        assert.strictEqual(resetResult[targetKey], DEFAULT_SETTINGS[targetKey]);

        for (const k of Object.keys(
          customSettings,
        ) as (keyof DiscordSyntaxSettings)[]) {
          if (k !== targetKey) {
            assert.strictEqual(
              resetResult[k],
              customSettings[k],
              `Field ${k} should remain unchanged when resetting ${targetKey}`,
            );
          }
        }
      },
    );
  }

  await t.test("does not change syntax enable toggles if requested", () => {
    const r1 = resetSingleAppearanceSetting(customSettings, "enableSpoilers");
    assert.deepStrictEqual(r1, customSettings);

    const r2 = resetSingleAppearanceSetting(customSettings, "enableSubtext");
    assert.deepStrictEqual(r2, customSettings);
  });
});

void test("resolveColorToHex Helper", async (t) => {
  await t.test("returns 6-digit hex as-is lowercased", () => {
    assert.strictEqual(resolveColorToHex("#AABBCC"), "#aabbcc");
  });

  await t.test("expands 3-digit hex to 6-digit hex", () => {
    assert.strictEqual(resolveColorToHex("#123"), "#112233");
  });

  await t.test(
    "extracts fallback hex from var() string when resolver is empty",
    () => {
      assert.strictEqual(
        resolveColorToHex("var(--background-modifier-hover, #36393f)"),
        "#36393f",
      );
      assert.strictEqual(
        resolveColorToHex("var(--text-normal, #dcddde)"),
        "#dcddde",
      );
    },
  );

  await t.test(
    "resolves CSS custom properties from PropertyResolver if present",
    () => {
      const mockResolver: PropertyResolver = {
        getPropertyValue(propName: string): string {
          if (propName === "--background-modifier-hover") {
            return "rgb(79, 84, 92)";
          }
          if (propName === "--text-muted") {
            return "#123456";
          }
          return "";
        },
      };

      assert.strictEqual(
        resolveColorToHex(
          "var(--background-modifier-hover, #36393f)",
          mockResolver,
        ),
        "#4f545c",
      );

      assert.strictEqual(
        resolveColorToHex("var(--text-muted, #72767d)", mockResolver),
        "#123456",
      );
    },
  );

  await t.test(
    "handles recursive var() resolution with PropertyResolver",
    () => {
      const mockResolver: PropertyResolver = {
        getPropertyValue(propName: string): string {
          if (propName === "--var-a") return "var(--var-b)";
          if (propName === "--var-b") return "#abcdef";
          return "";
        },
      };

      assert.strictEqual(
        resolveColorToHex("var(--var-a, #000000)", mockResolver),
        "#abcdef",
      );
    },
  );

  await t.test(
    "returns black fallback for empty or unresolvable values",
    () => {
      assert.strictEqual(resolveColorToHex(""), "#000000");
      assert.strictEqual(resolveColorToHex("invalid-color"), "#000000");
    },
  );
});

void test("getEnabledEditorExtensions Selection", async (t) => {
  await t.test("returns both extensions when both toggles enabled", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enableSpoilers: true,
      enableSubtext: true,
    };
    const ext = getEnabledEditorExtensions(settings);
    assert.strictEqual(ext.length, 2);
    assert.ok(ext.includes(subtextEditorPlugin));
    assert.ok(ext.includes(spoilerLivePreviewExtension));
  });

  await t.test("returns only spoiler extension when subtext disabled", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enableSpoilers: true,
      enableSubtext: false,
    };
    const ext = getEnabledEditorExtensions(settings);
    assert.strictEqual(ext.length, 1);
    assert.strictEqual(ext[0], spoilerLivePreviewExtension);
  });

  await t.test("returns only subtext extension when spoilers disabled", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enableSpoilers: false,
      enableSubtext: true,
    };
    const ext = getEnabledEditorExtensions(settings);
    assert.strictEqual(ext.length, 1);
    assert.strictEqual(ext[0], subtextEditorPlugin);
  });

  await t.test("returns empty array when both disabled", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enableSpoilers: false,
      enableSubtext: false,
    };
    const ext = getEnabledEditorExtensions(settings);
    assert.strictEqual(ext.length, 0);
  });
});

void test("Style Serialization", async (t) => {
  await t.test(
    "serializes numeric dimensions as px, ratios as string, colors unchanged",
    () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        spoilerRadius: 4,
        spoilerPadding: 6,
        subtextFontSize: 14,
        subtextOpacity: 0.75,
        spoilerHiddenColor: "#36393f",
      };

      const vars = serializeStyleVariables(settings);

      assert.strictEqual(vars["--discord-spoiler-radius"], "4px");
      assert.strictEqual(vars["--discord-spoiler-padding"], "6px");
      assert.strictEqual(vars["--discord-subtext-font-size"], "14px");
      assert.strictEqual(vars["--discord-subtext-opacity"], "0.75");
      assert.strictEqual(vars["--discord-spoiler-hidden-bg"], "#36393f");

      for (const key of STYLE_VARIABLE_KEYS) {
        assert.ok(key in vars, `Missing variable key: ${key}`);
      }
    },
  );
});

function createMockElement(): HTMLElement {
  const styles = new Map<string, string>();
  const classes = new Set<string>();

  const mockEl = {
    style: {
      setProperty(key: string, val: string) {
        styles.set(key, val);
      },
      removeProperty(key: string) {
        styles.delete(key);
      },
      getPropertyValue(key: string) {
        return styles.get(key) ?? "";
      },
    },
    classList: {
      add(cls: string) {
        classes.add(cls);
      },
      remove(cls: string) {
        classes.delete(cls);
      },
      contains(cls: string) {
        return classes.has(cls);
      },
    },
    _styles: styles,
    _classes: classes,
  };

  return mockEl as unknown as HTMLElement;
}

void test("Style Manager Apply & Remove", async (t) => {
  await t.test(
    "applies CSS variables and class to explicit target element",
    () => {
      const mockEl = createMockElement();
      const settings = {
        ...DEFAULT_SETTINGS,
        spoilerRadius: 8,
        spoilerHiddenColor: "#112233",
      };

      applyStyleVariables(settings, mockEl);

      const helpers = mockEl as unknown as {
        _styles: Map<string, string>;
        _classes: Set<string>;
      };
      assert.strictEqual(
        helpers._styles.get("--discord-spoiler-radius"),
        "8px",
      );
      assert.strictEqual(
        helpers._styles.get("--discord-spoiler-hidden-bg"),
        "#112233",
      );
      assert.ok(helpers._classes.has(STYLE_CLASS_NAME));
    },
  );

  await t.test(
    "removes only plugin-owned style variables and class, preserving unrelated properties",
    () => {
      const mockEl = createMockElement();
      mockEl.style.setProperty("--custom-user-var", "100px");
      mockEl.classList.add("custom-user-class");

      applyStyleVariables(DEFAULT_SETTINGS, mockEl);
      removeStyleVariables(mockEl);

      const helpers = mockEl as unknown as {
        _styles: Map<string, string>;
        _classes: Set<string>;
      };

      for (const key of STYLE_VARIABLE_KEYS) {
        assert.strictEqual(
          helpers._styles.has(key),
          false,
          `Variable ${key} should have been removed`,
        );
      }
      assert.strictEqual(helpers._classes.has(STYLE_CLASS_NAME), false);
      assert.strictEqual(helpers._styles.get("--custom-user-var"), "100px");
      assert.ok(helpers._classes.has("custom-user-class"));
    },
  );

  await t.test(
    "resets single appearance field styles on target element without altering other custom variables",
    () => {
      const mockEl = createMockElement();
      let customSettings: DiscordSyntaxSettings = {
        enableSpoilers: true,
        enableSubtext: true,
        spoilerHiddenColor: "#111111",
        spoilerRevealedColor: "#222222",
        spoilerTextColor: "#333333",
        spoilerRadius: 12,
        spoilerPadding: 8,
        subtextColor: "#444444",
        subtextFontSize: 18,
        subtextOpacity: 0.9,
      };

      applyStyleVariables(customSettings, mockEl);

      const helpers = mockEl as unknown as {
        _styles: Map<string, string>;
      };

      assert.strictEqual(
        helpers._styles.get("--discord-spoiler-radius"),
        "12px",
      );
      assert.strictEqual(
        helpers._styles.get("--discord-spoiler-padding"),
        "8px",
      );

      // Reset only spoilerRadius
      customSettings = resetSingleAppearanceSetting(
        customSettings,
        "spoilerRadius",
      );
      applyStyleVariables(customSettings, mockEl);

      // spoilerRadius should now equal DEFAULT_SETTINGS.spoilerRadius (4px)
      assert.strictEqual(
        helpers._styles.get("--discord-spoiler-radius"),
        "4px",
      );
      // spoilerPadding should remain 8px
      assert.strictEqual(
        helpers._styles.get("--discord-spoiler-padding"),
        "8px",
      );
      // spoilerHiddenColor should remain #111111
      assert.strictEqual(
        helpers._styles.get("--discord-spoiler-hidden-bg"),
        "#111111",
      );
    },
  );
});
