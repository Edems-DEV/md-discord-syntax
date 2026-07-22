import test from "node:test";
import assert from "node:assert";
import {
  findSpoilerRanges,
  isSubtextLine,
  stripSubtextPrefix,
  hasSubtextMarker,
} from "../src/index.js";

void test("Core Spoiler & Subtext Syntax Rules", async (t) => {
  await t.test("detects basic spoiler range", () => {
    const text = "Hello ||secret|| world";
    const spoilers = findSpoilerRanges(text);
    assert.strictEqual(spoilers.length, 1);
    assert.strictEqual(spoilers[0].from, 6);
    assert.strictEqual(spoilers[0].to, 16);
    assert.strictEqual(spoilers[0].contentFrom, 8);
    assert.strictEqual(spoilers[0].contentTo, 14);
  });

  await t.test("excludes inline code delimiters", () => {
    const text = "Here is `||` code and ||real spoiler||";
    const spoilers = findSpoilerRanges(text);
    assert.strictEqual(spoilers.length, 1);
    assert.strictEqual(spoilers[0].from, 22);
    assert.strictEqual(spoilers[0].to, 38);
  });

  await t.test("excludes fenced code blocks", () => {
    const text = "```ts\nconst x = ||not a spoiler||;\n```\n||actual spoiler||";
    const spoilers = findSpoilerRanges(text);
    assert.strictEqual(spoilers.length, 1);
    assert.strictEqual(
      text.slice(spoilers[0].from, spoilers[0].to),
      "||actual spoiler||",
    );
  });

  await t.test(
    "ignores unclosed delimiters, spaced delimiters, and empty spoilers",
    () => {
      assert.strictEqual(findSpoilerRanges("||unclosed text").length, 0);
      assert.strictEqual(
        findSpoilerRanges("This line has || an incomplete spoiler marker.")
          .length,
        0,
      );
      assert.strictEqual(findSpoilerRanges("||||").length, 0);
      assert.strictEqual(findSpoilerRanges("|| spaced ||").length, 0);
      assert.strictEqual(findSpoilerRanges("||left space ||").length, 0);
      assert.strictEqual(findSpoilerRanges("|| right space||").length, 0);
    },
  );

  await t.test(
    "detects glued inline spoilers with internal spaces and punctuation",
    () => {
      const text =
        "||glued|| and ||glued with spaces inside|| and ||glued with punctuation!||";
      const spoilers = findSpoilerRanges(text);
      assert.strictEqual(spoilers.length, 3);
      assert.strictEqual(
        text.slice(spoilers[0].from, spoilers[0].to),
        "||glued||",
      );
      assert.strictEqual(
        text.slice(spoilers[1].from, spoilers[1].to),
        "||glued with spaces inside||",
      );
      assert.strictEqual(
        text.slice(spoilers[2].from, spoilers[2].to),
        "||glued with punctuation!||",
      );
    },
  );

  await t.test("detects multi-paragraph block spoilers", () => {
    const text = "||\nFirst paragraph\n\nSecond paragraph\n||";
    const spoilers = findSpoilerRanges(text);
    assert.strictEqual(spoilers.length, 1);
    assert.strictEqual(spoilers[0].isBlock, true);
    assert.strictEqual(
      text.slice(spoilers[0].from, spoilers[0].to),
      "||\nFirst paragraph\n\nSecond paragraph\n||",
    );
  });

  await t.test("rejects cross-paragraph inline spoilers", () => {
    const text = "Paragraph 1 ||inline\n\nParagraph 2 inline||";
    const spoilers = findSpoilerRanges(text);
    assert.strictEqual(spoilers.length, 0);
  });

  await t.test("ignores escaped delimiters", () => {
    const text = "Here is \\||not a spoiler\\|| and ||real spoiler||";
    const spoilers = findSpoilerRanges(text);
    assert.strictEqual(spoilers.length, 1);
    assert.strictEqual(
      text.slice(spoilers[0].from, spoilers[0].to),
      "||real spoiler||",
    );
  });

  await t.test("detects spoiler containing inline code", () => {
    const text = "Here is ||secret `inline code` message||.";
    const spoilers = findSpoilerRanges(text);
    assert.strictEqual(spoilers.length, 1);
    assert.strictEqual(
      text.slice(spoilers[0].from, spoilers[0].to),
      "||secret `inline code` message||",
    );
  });

  await t.test("subtext detection and prefix stripping", () => {
    assert.strictEqual(isSubtextLine("-# Subtext line"), true);
    assert.strictEqual(isSubtextLine("-#not subtext"), false);
    assert.strictEqual(isSubtextLine(" -# leading space subtext"), true);
    assert.strictEqual(isSubtextLine("Normal text"), false);
    assert.strictEqual(isSubtextLine("> -# Callout subtext"), true);
    assert.strictEqual(isSubtextLine("- -# List subtext"), true);
    assert.strictEqual(isSubtextLine("1. -# Numbered list subtext"), true);
    assert.strictEqual(isSubtextLine("- [ ] -# Task subtext"), true);

    assert.strictEqual(stripSubtextPrefix("-# Hello"), "Hello");
    assert.strictEqual(stripSubtextPrefix("> -# Hello"), "> Hello");
    assert.strictEqual(stripSubtextPrefix("- -# Hello"), "- Hello");
    assert.strictEqual(stripSubtextPrefix("  -# Hello"), "  Hello");
    assert.strictEqual(stripSubtextPrefix("Normal text"), "Normal text");

    assert.strictEqual(hasSubtextMarker("First line\n-# Second line"), true);
    assert.strictEqual(
      hasSubtextMarker("Callout header\n> -# Callout subtext"),
      true,
    );
    assert.strictEqual(
      hasSubtextMarker("List header\n- -# Subtext item"),
      true,
    );
    assert.strictEqual(hasSubtextMarker("First line\nSecond line"), false);
  });
});
