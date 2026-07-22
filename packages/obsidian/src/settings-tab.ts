import { PluginSettingTab, Setting, App } from "obsidian";
import type DiscordSyntaxPlugin from "./main";
import { resetAppearanceSettings } from "./settings";

export class DiscordSyntaxSettingTab extends PluginSettingTab {
  plugin: DiscordSyntaxPlugin;

  constructor(app: App, plugin: DiscordSyntaxPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Discord Syntax Settings" });

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

    const hiddenColorSetting = new Setting(spoilerContent)
      .setName("Hidden background color")
      .setDesc("Background color of unrevealed spoilers.")
      .addColorPicker((cp) =>
        cp.setValue(this.plugin.settings.spoilerHiddenColor).onChange((val) => {
          this.plugin.settings.spoilerHiddenColor = val;
          updateStyles();
          void this.plugin.saveSettings();
        }),
      );
    spoilerSettingsList.push(hiddenColorSetting);

    const revealedColorSetting = new Setting(spoilerContent)
      .setName("Revealed background color")
      .setDesc("Background color of revealed or hovered spoilers.")
      .addColorPicker((cp) =>
        cp
          .setValue(this.plugin.settings.spoilerRevealedColor)
          .onChange((val) => {
            this.plugin.settings.spoilerRevealedColor = val;
            updateStyles();
            void this.plugin.saveSettings();
          }),
      );
    spoilerSettingsList.push(revealedColorSetting);

    const textColorSetting = new Setting(spoilerContent)
      .setName("Revealed text color")
      .setDesc("Text color of revealed spoilers.")
      .addColorPicker((cp) =>
        cp.setValue(this.plugin.settings.spoilerTextColor).onChange((val) => {
          this.plugin.settings.spoilerTextColor = val;
          updateStyles();
          void this.plugin.saveSettings();
        }),
      );
    spoilerSettingsList.push(textColorSetting);

    const radiusSetting = new Setting(spoilerContent)
      .setName("Corner radius (px)")
      .setDesc("Border radius for spoiler caps (0 to 16px).")
      .addSlider((slider) =>
        slider
          .setLimits(0, 16, 1)
          .setValue(this.plugin.settings.spoilerRadius)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.spoilerRadius = val;
            updateStyles();
            void this.plugin.saveSettings();
          }),
      );
    spoilerSettingsList.push(radiusSetting);

    const paddingSetting = new Setting(spoilerContent)
      .setName("Cap padding (px)")
      .setDesc("Horizontal padding for outer spoiler edges (0 to 12px).")
      .addSlider((slider) =>
        slider
          .setLimits(0, 12, 1)
          .setValue(this.plugin.settings.spoilerPadding)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.spoilerPadding = val;
            updateStyles();
            void this.plugin.saveSettings();
          }),
      );
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
    const subtextP1 = subtextPreviewBox.createEl("p", {
      cls: "discord-syntax-preview-p",
      text: "This is a regular body text line in note.",
    });
    subtextP1.style.margin = "0 0 6px 0";

    const subtextP2 = subtextPreviewBox.createEl("p", {
      cls: "discord-syntax-preview-p",
    });
    subtextP2.style.margin = "0";
    subtextP2.createSpan({
      cls: "discord-subtext",
      text: "-# This is a secondary subtext line preview.",
    });

    const subtextSettingsList: Setting[] = [];

    const subtextColorSetting = new Setting(subtextContent)
      .setName("Subtext color")
      .setDesc("Text color for subtext items.")
      .addColorPicker((cp) =>
        cp.setValue(this.plugin.settings.subtextColor).onChange((val) => {
          this.plugin.settings.subtextColor = val;
          updateStyles();
          void this.plugin.saveSettings();
        }),
      );
    subtextSettingsList.push(subtextColorSetting);

    const subtextFontSizeSetting = new Setting(subtextContent)
      .setName("Subtext font size (px)")
      .setDesc("Font size for subtext items (8 to 24px).")
      .addSlider((slider) =>
        slider
          .setLimits(8, 24, 1)
          .setValue(this.plugin.settings.subtextFontSize)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.subtextFontSize = val;
            updateStyles();
            void this.plugin.saveSettings();
          }),
      );
    subtextSettingsList.push(subtextFontSizeSetting);

    const subtextOpacitySetting = new Setting(subtextContent)
      .setName("Subtext opacity")
      .setDesc("Opacity for subtext items (0.1 to 1.0).")
      .addSlider((slider) =>
        slider
          .setLimits(0.1, 1.0, 0.05)
          .setValue(this.plugin.settings.subtextOpacity)
          .setDynamicTooltip()
          .onChange((val) => {
            this.plugin.settings.subtextOpacity = val;
            updateStyles();
            void this.plugin.saveSettings();
          }),
      );
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

    // ── 5. Enablement & Section State Manager ────────────────────────────
    const updateSections = () => {
      const spoilersEnabled = this.plugin.settings.enableSpoilers;
      if (!spoilersEnabled) {
        spoilerDetails.removeAttribute("open");
        spoilerDetails.addClass("is-disabled");
        spoilerMsg.style.display = "block";
        spoilerSettingsList.forEach((s) => {
          s.setDisabled(true);
        });
      } else {
        spoilerDetails.removeClass("is-disabled");
        spoilerMsg.style.display = "none";
        spoilerSettingsList.forEach((s) => {
          s.setDisabled(false);
        });
      }

      const subtextEnabled = this.plugin.settings.enableSubtext;
      if (!subtextEnabled) {
        subtextDetails.removeAttribute("open");
        subtextDetails.addClass("is-disabled");
        subtextMsg.style.display = "block";
        subtextSettingsList.forEach((s) => {
          s.setDisabled(true);
        });
      } else {
        subtextDetails.removeClass("is-disabled");
        subtextMsg.style.display = "none";
        subtextSettingsList.forEach((s) => {
          s.setDisabled(false);
        });
      }
    };

    updateSections();
    updateStyles();
  }
}
