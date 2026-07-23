import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

interface CommandRegistration {
  id: string;
  callback: () => void;
}

class PluginStub {
  app: WorkspaceStub;
  markdownPostProcessors: Array<(element: HTMLElement) => void> = [];
  registeredEditorExtensions: unknown[][] = [];
  commands: CommandRegistration[] = [];
  events: unknown[] = [];
  settingTabs: unknown[] = [];
  savedData: unknown[] = [];

  constructor(app: WorkspaceStub) {
    this.app = app;
  }

  loadData(): Promise<unknown> {
    return Promise.resolve(undefined);
  }

  saveData(data: unknown): Promise<void> {
    this.savedData.push(data);
    return Promise.resolve();
  }

  registerEvent(event: unknown): void {
    this.events.push(event);
  }

  registerMarkdownPostProcessor(
    processor: (element: HTMLElement) => void,
  ): void {
    this.markdownPostProcessors.push(processor);
  }

  registerEditorExtension(extensions: unknown[]): void {
    this.registeredEditorExtensions.push(extensions);
  }

  addCommand(command: CommandRegistration): void {
    this.commands.push(command);
  }

  addSettingTab(tab: unknown): void {
    this.settingTabs.push(tab);
  }
}

class PluginSettingTabStub {
  app: WorkspaceStub;
  containerEl = {};

  constructor(app: WorkspaceStub) {
    this.app = app;
  }
}

class SettingStub {}
class MarkdownViewStub {}
class NoticeStub {}
class ColorComponentStub {}
class SliderComponentStub {}

function createStyleTarget(): HTMLElement {
  const properties = new Map<string, string>();
  const classes = new Set<string>();
  return {
    style: {
      setProperty(name: string, value: string) {
        properties.set(name, value);
      },
      removeProperty(name: string) {
        properties.delete(name);
      },
      getPropertyValue(name: string) {
        return properties.get(name) ?? "";
      },
    },
    classList: {
      add(name: string) {
        classes.add(name);
      },
      remove(name: string) {
        classes.delete(name);
      },
      contains(name: string) {
        return classes.has(name);
      },
    },
    _properties: properties,
    _classes: classes,
  } as unknown as HTMLElement;
}

interface WorkspaceStub {
  workspace: {
    containerEl: { ownerDocument: { body: HTMLElement } };
    on: (name: string, callback: () => void) => { name: string };
    getActiveViewOfType: () => null;
    updateOptions: () => void;
    iterateAllLeaves: (callback: (leaf: unknown) => void) => void;
  };
}

const require = createRequire(import.meta.url);
const obsidian = require("obsidian") as Record<string, unknown>;
Object.assign(obsidian, {
  Plugin: PluginStub,
  PluginSettingTab: PluginSettingTabStub,
  Setting: SettingStub,
  MarkdownView: MarkdownViewStub,
  Notice: NoticeStub,
  ColorComponent: ColorComponentStub,
  SliderComponent: SliderComponentStub,
});

void test("Obsidian plugin lifecycle", async (t) => {
  const { default: DiscordSyntaxPlugin } = await import("../src/main.js");

  await t.test(
    "registers, rebuilds, saves, and cleans up plugin state",
    async () => {
      const body = createStyleTarget();
      let updateOptionsCalls = 0;
      const app: WorkspaceStub = {
        workspace: {
          containerEl: { ownerDocument: { body } },
          on(name) {
            return { name };
          },
          getActiveViewOfType() {
            return null;
          },
          updateOptions() {
            updateOptionsCalls++;
          },
          iterateAllLeaves() {},
        },
      };

      const plugin = new DiscordSyntaxPlugin(
        app as never,
        {} as never,
      ) as InstanceType<typeof DiscordSyntaxPlugin> & PluginStub;

      await plugin.onload();

      assert.strictEqual(plugin.events.length, 2);
      assert.strictEqual(plugin.markdownPostProcessors.length, 1);
      assert.strictEqual(plugin.registeredEditorExtensions.length, 1);
      assert.strictEqual(plugin.registeredEditorExtensions[0].length, 2);
      assert.strictEqual(plugin.settingTabs.length, 1);
      assert.deepStrictEqual(
        plugin.commands.map((command) => command.id),
        ["toggle-all-spoilers"],
      );
      assert.strictEqual(
        body.classList.contains("discord-syntax-enabled"),
        true,
      );

      plugin.settings.enableSpoilers = false;
      plugin.rebuildEditorExtensions();
      assert.strictEqual(updateOptionsCalls, 1);
      assert.strictEqual(plugin.registeredEditorExtensions[0].length, 1);

      await plugin.saveSettings();
      assert.strictEqual(plugin.savedData.length, 1);

      assert.doesNotThrow(() => plugin.commands[0].callback());

      plugin.onunload();
      assert.strictEqual(
        body.classList.contains("discord-syntax-enabled"),
        false,
      );
    },
  );
});
