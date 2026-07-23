import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { remarkDiscordSyntax } from "@edems-dev/remark-discord-syntax";
import DefaultDiscordSyntax, {
  DEFAULT_STYLES,
  DiscordSyntax,
} from "../src/index.js";

void test("Quartz DiscordSyntax Plugin", async (t) => {
  await t.test("exports both named and default DiscordSyntax factory", () => {
    assert.strictEqual(typeof DiscordSyntax, "function");
    assert.strictEqual(typeof DefaultDiscordSyntax, "function");
    assert.strictEqual(DiscordSyntax, DefaultDiscordSyntax);
  });

  await t.test("plugin registration & naming", () => {
    const plugin = DiscordSyntax();
    assert.strictEqual(plugin.name, "DiscordSyntax");
  });

  await t.test("markdownPlugins() hook returns remarkDiscordSyntax", () => {
    const plugin = DiscordSyntax();
    assert.ok(typeof plugin.markdownPlugins === "function");
    const plugins = plugin.markdownPlugins();
    assert.ok(Array.isArray(plugins));
    assert.strictEqual(plugins.length, 1);
    assert.strictEqual(plugins[0], remarkDiscordSyntax);
  });

  await t.test(
    "externalResources() default behavior (enableDefaultStyles: true / default)",
    () => {
      const defaultPlugin = DiscordSyntax();
      assert.ok(typeof defaultPlugin.externalResources === "function");
      const defaultResources = defaultPlugin.externalResources();
      assert.ok(defaultResources);
      assert.ok(Array.isArray(defaultResources.css));
      assert.strictEqual(defaultResources.css.length, 1);
      assert.strictEqual(defaultResources.css[0].inline, true);
      assert.ok(
        defaultResources.css[0].content.includes("discord-syntax-spoiler") ||
          defaultResources.css[0].content.includes("discord-spoiler"),
        "CSS should include spoiler styles",
      );
      assert.ok(
        defaultResources.css[0].content.includes("discord-syntax-subtext") ||
          defaultResources.css[0].content.includes("discord-subtext"),
        "CSS should include subtext styles",
      );

      const explicitPlugin = DiscordSyntax({ enableDefaultStyles: true });
      const explicitResources = explicitPlugin.externalResources();
      assert.ok(explicitResources);
      assert.ok(Array.isArray(explicitResources.css));
      assert.strictEqual(explicitResources.css.length, 1);
      assert.strictEqual(explicitResources.css[0].inline, true);
    },
  );

  await t.test("externalResources() with enableDefaultStyles: false", () => {
    const disabledPlugin = DiscordSyntax({ enableDefaultStyles: false });
    assert.ok(typeof disabledPlugin.externalResources === "function");
    const disabledResources = disabledPlugin.externalResources();
    assert.deepStrictEqual(disabledResources, {});
  });

  await t.test(
    "published stylesheet exactly matches inline default styles",
    () => {
      const stylesheet = fs.readFileSync(
        path.join(process.cwd(), "styles.css"),
        "utf8",
      );
      assert.strictEqual(stylesheet.trimEnd(), DEFAULT_STYLES.trimEnd());
    },
  );
});
