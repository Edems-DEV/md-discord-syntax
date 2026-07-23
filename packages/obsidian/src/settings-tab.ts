import {
  PluginSettingTab,
  Setting,
  App,
  ColorComponent,
  SliderComponent,
  Notice,
} from "obsidian";
import type DiscordSyntaxPlugin from "./main";
import {
  DEFAULT_SETTINGS,
  resetAppearanceSettings,
  resetSingleAppearanceSetting,
  resolveColorToHex,
} from "./settings";

function addSettingWithCssVar(
  container: HTMLElement,
  name: string,
  descText: string,
  cssVar: string,
): Setting {
  const setting = new Setting(container).setName(name);
  setting.setDesc(descText + " CSS variable: ");
  const codeEl = setting.descEl.createEl("code", {
    text: cssVar,
    cls: "discord-syntax-code-var",
  });
  codeEl.setAttr("title", `CSS variable: ${cssVar}`);
  return setting;
}

export class DiscordSyntaxSettingTab extends PluginSettingTab {
  plugin: DiscordSyntaxPlugin;
  private copyTimeoutId: number | null = null;

  constructor(app: App, plugin: DiscordSyntaxPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  override hide(): void {
    if (this.copyTimeoutId !== null) {
      window.clearTimeout(this.copyTimeoutId);
      this.copyTimeoutId = null;
    }
    super.hide();
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    if (this.copyTimeoutId !== null) {
      window.clearTimeout(this.copyTimeoutId);
      this.copyTimeoutId = null;
    }

    new Setting(containerEl).setName("Discord Syntax Settings").setHeading();

    // Helper for applying current styles to DOM synchronously
    const updateStyles = () => {
      const settingsBody = containerEl.ownerDocument?.body;
      this.plugin.applyStyles(settingsBody);
    };

    // ── 1. Always-visible Syntax Toggles ─────────────────────────────────
    new Setting(containerEl)
      .setName("Enable Spoilers syntax")
      .setDesc("Enable ||spoiler|| syntax in Reading View and Live Preview.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableSpoilers)
          .onChange((value) => {
            if (this.plugin.settings.enableSpoilers === value) return;
            this.plugin.settings.enableSpoilers = value;
            this.plugin.rebuildEditorExtensions();
            updateSections();
            void this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Enable Subtext syntax")
      .setDesc("Enable -# subtext syntax in Reading View and Live Preview.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableSubtext)
          .onChange((value) => {
            if (this.plugin.settings.enableSubtext === value) return;
            this.plugin.settings.enableSubtext = value;
            this.plugin.rebuildEditorExtensions();
            updateSections();
            void this.plugin.saveSettings();
          }),
      );

    // ── 2. Spoiler Appearance Section (<details>) ───────────────────────
    const spoilerDetails = containerEl.createEl("details", {
      cls: "discord-syntax-details",
    });
    spoilerDetails.createEl("summary", { text: "Spoiler appearance" });
    const spoilerContent = spoilerDetails.createEl("div", {
      cls: "discord-syntax-section-content",
    });

    const spoilerMsg = spoilerContent.createEl("div", {
      cls: "discord-syntax-disabled-msg",
      text: "Enable Spoilers syntax above to customize appearance.",
    });

    // Spoiler Live Preview Box
    const spoilerPreviewBox = spoilerContent.createEl("div", {
      cls: "markdown-rendered markdown-preview-view discord-syntax-preview-box",
    });
    const spoilerP = spoilerPreviewBox.createEl("p", {
      cls: "discord-syntax-preview-p",
    });
    spoilerP.createSpan({ text: "Preview: " });

    const spoilerEl = spoilerP.createSpan({
      cls: "discord-syntax-spoiler note-flow-spoiler discord-syntax-spoiler-single",
    });
    spoilerEl.setAttr("role", "button");
    spoilerEl.setAttr("tabindex", "0");
    spoilerEl.setAttr("aria-expanded", "false");
    spoilerEl.setAttr("aria-label", "Spoiler, click to reveal");

    const spoilerInner = spoilerEl.createSpan({
      cls: "discord-syntax-spoiler-content",
      text: "Hidden spoiler content",
    });
    spoilerInner.setAttr("aria-hidden", "true");

    spoilerEl.addEventListener("mouseenter", () => {
      spoilerEl.addClass("is-hovered");
    });
    spoilerEl.addEventListener("mouseleave", () => {
      spoilerEl.removeClass("is-hovered");
    });

    const toggleSpoilerPreview = () => {
      const isRevealed = spoilerEl.hasClass("is-revealed");
      if (isRevealed) {
        spoilerEl.removeClass("is-revealed");
        spoilerEl.setAttr("aria-expanded", "false");
        spoilerEl.setAttr("aria-label", "Spoiler, click to reveal");
        spoilerInner.setAttr("aria-hidden", "true");
      } else {
        spoilerEl.addClass("is-revealed");
        spoilerEl.setAttr("aria-expanded", "true");
        spoilerEl.removeAttribute("aria-label");
        spoilerInner.setAttr("aria-hidden", "false");
      }
    };

    spoilerEl.addEventListener("click", toggleSpoilerPreview);
    spoilerEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        toggleSpoilerPreview();
      }
    });

    const spoilerSettingsList: Setting[] = [];

    // 1. Hidden background color
    let hiddenColorPicker: ColorComponent | null = null;
    const hiddenColorSetting = addSettingWithCssVar(
      spoilerContent,
      "Hidden background color",
      "Background color of unrevealed spoilers.",
      "--discord-spoiler-hidden-bg",
    )
      .addColorPicker((cp) => {
        hiddenColorPicker = cp;
        cp.setValue(
          resolveColorToHex(
            this.plugin.settings.spoilerHiddenColor,
            containerEl,
          ),
        ).onChange((val) => {
          this.plugin.settings.spoilerHiddenColor = val;
          updateStyles();
          void this.plugin.saveSettings();
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset hidden background color to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "spoilerHiddenColor",
            );
            updateStyles();
            if (hiddenColorPicker) {
              hiddenColorPicker.setValue(
                resolveColorToHex(
                  DEFAULT_SETTINGS.spoilerHiddenColor,
                  containerEl,
                ),
              );
            }
            void this.plugin.saveSettings();
          });
      });
    spoilerSettingsList.push(hiddenColorSetting);

    // 2. Revealed background color
    let revealedColorPicker: ColorComponent | null = null;
    const revealedColorSetting = addSettingWithCssVar(
      spoilerContent,
      "Revealed background color",
      "Background color of revealed or hovered spoilers.",
      "--discord-spoiler-revealed-bg",
    )
      .addColorPicker((cp) => {
        revealedColorPicker = cp;
        cp.setValue(
          resolveColorToHex(
            this.plugin.settings.spoilerRevealedColor,
            containerEl,
          ),
        ).onChange((val) => {
          this.plugin.settings.spoilerRevealedColor = val;
          updateStyles();
          void this.plugin.saveSettings();
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset revealed background color to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "spoilerRevealedColor",
            );
            updateStyles();
            if (revealedColorPicker) {
              revealedColorPicker.setValue(
                resolveColorToHex(
                  DEFAULT_SETTINGS.spoilerRevealedColor,
                  containerEl,
                ),
              );
            }
            void this.plugin.saveSettings();
          });
      });
    spoilerSettingsList.push(revealedColorSetting);

    // 3. Revealed text color
    let textColorPicker: ColorComponent | null = null;
    const textColorSetting = addSettingWithCssVar(
      spoilerContent,
      "Revealed text color",
      "Text color of revealed spoilers.",
      "--discord-spoiler-text-color",
    )
      .addColorPicker((cp) => {
        textColorPicker = cp;
        cp.setValue(
          resolveColorToHex(this.plugin.settings.spoilerTextColor, containerEl),
        ).onChange((val) => {
          this.plugin.settings.spoilerTextColor = val;
          updateStyles();
          void this.plugin.saveSettings();
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset revealed text color to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "spoilerTextColor",
            );
            updateStyles();
            if (textColorPicker) {
              textColorPicker.setValue(
                resolveColorToHex(
                  DEFAULT_SETTINGS.spoilerTextColor,
                  containerEl,
                ),
              );
            }
            void this.plugin.saveSettings();
          });
      });
    spoilerSettingsList.push(textColorSetting);

    // 4. Corner radius
    let radiusSlider: SliderComponent | null = null;
    const radiusSetting = addSettingWithCssVar(
      spoilerContent,
      "Corner radius (px)",
      "Border radius for spoiler caps (0 to 16px).",
      "--discord-spoiler-radius",
    )
      .addSlider((slider) => {
        radiusSlider = slider;
        slider
          .setLimits(0, 16, 1)
          .setValue(this.plugin.settings.spoilerRadius)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.spoilerRadius = val;
            updateStyles();
            void this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset corner radius to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "spoilerRadius",
            );
            updateStyles();
            if (radiusSlider) {
              radiusSlider.setValue(DEFAULT_SETTINGS.spoilerRadius);
            }
            void this.plugin.saveSettings();
          });
      });
    spoilerSettingsList.push(radiusSetting);

    // 5. Cap padding
    let paddingSlider: SliderComponent | null = null;
    const paddingSetting = addSettingWithCssVar(
      spoilerContent,
      "Cap padding (px)",
      "Horizontal padding for outer spoiler edges (0 to 12px).",
      "--discord-spoiler-padding",
    )
      .addSlider((slider) => {
        paddingSlider = slider;
        slider
          .setLimits(0, 12, 1)
          .setValue(this.plugin.settings.spoilerPadding)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.spoilerPadding = val;
            updateStyles();
            void this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset cap padding to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "spoilerPadding",
            );
            updateStyles();
            if (paddingSlider) {
              paddingSlider.setValue(DEFAULT_SETTINGS.spoilerPadding);
            }
            void this.plugin.saveSettings();
          });
      });
    spoilerSettingsList.push(paddingSetting);

    // ── 3. Subtext Appearance Section (<details>) ───────────────────────
    const subtextDetails = containerEl.createEl("details", {
      cls: "discord-syntax-details",
    });
    subtextDetails.createEl("summary", { text: "Subtext appearance" });
    const subtextContent = subtextDetails.createEl("div", {
      cls: "discord-syntax-section-content",
    });

    const subtextMsg = subtextContent.createEl("div", {
      cls: "discord-syntax-disabled-msg",
      text: "Enable Subtext syntax above to customize appearance.",
    });

    // Subtext Live Preview Box
    const subtextPreviewBox = subtextContent.createEl("div", {
      cls: "markdown-rendered markdown-preview-view discord-syntax-preview-box",
    });
    subtextPreviewBox.createEl("p", {
      cls: "discord-syntax-preview-p discord-syntax-preview-p-margin",
      text: "This is a regular body text line in note.",
    });

    const subtextP2 = subtextPreviewBox.createEl("p", {
      cls: "discord-syntax-preview-p",
    });
    subtextP2.createSpan({
      cls: "discord-subtext",
      text: "-# This is a secondary subtext line preview.",
    });

    const subtextSettingsList: Setting[] = [];

    // 6. Subtext color
    let subtextColorPicker: ColorComponent | null = null;
    const subtextColorSetting = addSettingWithCssVar(
      subtextContent,
      "Subtext color",
      "Text color for subtext items.",
      "--discord-subtext-color",
    )
      .addColorPicker((cp) => {
        subtextColorPicker = cp;
        cp.setValue(
          resolveColorToHex(this.plugin.settings.subtextColor, containerEl),
        ).onChange((val) => {
          this.plugin.settings.subtextColor = val;
          updateStyles();
          void this.plugin.saveSettings();
        });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset subtext color to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "subtextColor",
            );
            updateStyles();
            if (subtextColorPicker) {
              subtextColorPicker.setValue(
                resolveColorToHex(DEFAULT_SETTINGS.subtextColor, containerEl),
              );
            }
            void this.plugin.saveSettings();
          });
      });
    subtextSettingsList.push(subtextColorSetting);

    // 7. Subtext font size
    let subtextFontSizeSlider: SliderComponent | null = null;
    const subtextFontSizeSetting = addSettingWithCssVar(
      subtextContent,
      "Subtext font size (px)",
      "Font size for subtext items (8 to 24px).",
      "--discord-subtext-font-size",
    )
      .addSlider((slider) => {
        subtextFontSizeSlider = slider;
        slider
          .setLimits(8, 24, 1)
          .setValue(this.plugin.settings.subtextFontSize)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.subtextFontSize = val;
            updateStyles();
            void this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset subtext font size to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "subtextFontSize",
            );
            updateStyles();
            if (subtextFontSizeSlider) {
              subtextFontSizeSlider.setValue(DEFAULT_SETTINGS.subtextFontSize);
            }
            void this.plugin.saveSettings();
          });
      });
    subtextSettingsList.push(subtextFontSizeSetting);

    // 8. Subtext opacity
    let subtextOpacitySlider: SliderComponent | null = null;
    const subtextOpacitySetting = addSettingWithCssVar(
      subtextContent,
      "Subtext opacity",
      "Opacity for subtext items (0.1 to 1.0).",
      "--discord-subtext-opacity",
    )
      .addSlider((slider) => {
        subtextOpacitySlider = slider;
        slider
          .setLimits(0.1, 1.0, 0.05)
          .setValue(this.plugin.settings.subtextOpacity)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.subtextOpacity = val;
            updateStyles();
            void this.plugin.saveSettings();
          });
      })
      .addExtraButton((btn) => {
        btn
          .setIcon("rotate-ccw")
          .setTooltip("Reset subtext opacity to default")
          .onClick(() => {
            this.plugin.settings = resetSingleAppearanceSetting(
              this.plugin.settings,
              "subtextOpacity",
            );
            updateStyles();
            if (subtextOpacitySlider) {
              subtextOpacitySlider.setValue(DEFAULT_SETTINGS.subtextOpacity);
            }
            void this.plugin.saveSettings();
          });
      });
    subtextSettingsList.push(subtextOpacitySetting);

    // ── 4. Advanced Section (<details>) ──────────────────────────────────
    const advancedDetails = containerEl.createEl("details", {
      cls: "discord-syntax-details",
    });
    advancedDetails.createEl("summary", { text: "Advanced" });
    const advancedContent = advancedDetails.createEl("div", {
      cls: "discord-syntax-section-content",
    });

    new Setting(advancedContent)
      .setName("Reset appearance settings")
      .setDesc(
        "Reset colors, size, opacity, radius, and padding to default values. Syntax toggles are preserved.",
      )
      .addButton((btn) =>
        btn
          .setButtonText("Reset to defaults")
          .setWarning()
          .onClick(() => {
            this.plugin.settings = resetAppearanceSettings(
              this.plugin.settings,
            );
            updateStyles();
            this.display();
            void this.plugin.saveSettings();
          }),
      );

    // Custom CSS Guide in Advanced Section
    const cssGuideEl = advancedContent.createEl("div", {
      cls: "discord-syntax-css-guide",
    });

    new Setting(cssGuideEl)
      .setName("Custom CSS & Theme Customization")
      .setHeading();
    cssGuideEl.createEl("p", {
      text: "The plugin sets inline CSS variables on document.body when custom settings are saved. To override these variables without !important, target element selectors directly (such as .discord-syntax-spoiler, .note-flow-spoiler, .discord-subtext, or .discord-subtext-marker).",
    });

    const exampleSnippet = `/* Custom CSS snippet for spoilers (covering main & alias classes) */
.discord-syntax-spoiler,
.note-flow-spoiler {
  --discord-spoiler-hidden-bg: #2b2d31;
  --discord-spoiler-revealed-bg: #404249;
  --discord-spoiler-text-color: #f2f3f5;
  --discord-spoiler-radius: 6px;
  --discord-spoiler-padding: 4px;
}

/* Custom CSS snippet for subtext and subtext markers */
.discord-subtext,
.discord-subtext-marker,
.discord-subtext-marker-active {
  --discord-subtext-color: #949ba4;
  --discord-subtext-font-size: 12px;
  --discord-subtext-opacity: 0.8;
}`;

    const codePre = cssGuideEl.createEl("pre", {
      cls: "discord-syntax-code-block",
    });
    codePre.createEl("code", { text: exampleSnippet });

    new Setting(cssGuideEl)
      .setName("Copy example CSS snippet")
      .setDesc(
        "Copy standard CSS snippet for theme customization to clipboard.",
      )
      .addButton((btn) =>
        btn.setButtonText("Copy snippet").onClick(() => {
          const doCopy = async () => {
            try {
              await navigator.clipboard.writeText(exampleSnippet);
              btn.setButtonText("Copied!");
              if (this.copyTimeoutId !== null) {
                window.clearTimeout(this.copyTimeoutId);
              }
              this.copyTimeoutId = window.setTimeout(() => {
                this.copyTimeoutId = null;
                if (btn.buttonEl && btn.buttonEl.isConnected) {
                  btn.setButtonText("Copy snippet");
                }
              }, 2000);
            } catch {
              new Notice("Failed to copy CSS snippet to clipboard.");
            }
          };
          void doCopy();
        }),
      );

    // ── 5. Enablement & Section State Manager ────────────────────────────
    const updateSections = () => {
      const spoilersEnabled = this.plugin.settings.enableSpoilers;
      if (!spoilersEnabled) {
        spoilerDetails.removeAttribute("open");
        spoilerDetails.addClass("is-disabled");
        spoilerMsg.removeClass("u-hidden");
        spoilerSettingsList.forEach((s) => {
          s.setDisabled(true);
        });
      } else {
        spoilerDetails.removeClass("is-disabled");
        spoilerMsg.addClass("u-hidden");
        spoilerSettingsList.forEach((s) => {
          s.setDisabled(false);
        });
      }

      const subtextEnabled = this.plugin.settings.enableSubtext;
      if (!subtextEnabled) {
        subtextDetails.removeAttribute("open");
        subtextDetails.addClass("is-disabled");
        subtextMsg.removeClass("u-hidden");
        subtextSettingsList.forEach((s) => {
          s.setDisabled(true);
        });
      } else {
        subtextDetails.removeClass("is-disabled");
        subtextMsg.addClass("u-hidden");
        subtextSettingsList.forEach((s) => {
          s.setDisabled(false);
        });
      }
    };

    updateSections();
    updateStyles();
  }
}
