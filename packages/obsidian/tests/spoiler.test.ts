import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  isRangeInCodeNode,
  getSpoilerFragments,
  buildSpoilerDecorations,
  findSpoilerRanges,
  isSelectionInSpoiler,
} from "../src/spoiler-detector.js";

if (typeof Element !== "undefined") {
  const proto = Element.prototype as unknown as {
    find?: (s: string) => Element | null;
    findAll?: (s: string) => Element[];
  };
  if (typeof proto.find !== "function") {
    proto.find = function (selector: string) {
      return (this as unknown as HTMLElement).querySelector(selector);
    };
  }
  if (typeof proto.findAll !== "function") {
    proto.findAll = function (selector: string) {
      return Array.from(
        (this as unknown as HTMLElement).querySelectorAll(selector),
      );
    };
  }
}

void test("Spoiler Detection & Live Preview", async (t) => {
  await t.test("detects basic spoiler range", () => {
    const text = "Hello ||secret|| world";
    const ranges = findSpoilerRanges(text);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].from, 6);
    assert.strictEqual(ranges[0].to, 16);
    assert.strictEqual(ranges[0].contentFrom, 8);
    assert.strictEqual(ranges[0].contentTo, 14);
  });

  await t.test("excludes inline code delimiters", () => {
    const text = "Here is `||` code and ||real spoiler||";
    const ranges = findSpoilerRanges(text);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].from, 22);
    assert.strictEqual(ranges[0].to, 38);
  });

  await t.test("excludes fenced code block content", () => {
    const text = "```ts\nconst x = ||not a spoiler||;\n```\n||actual spoiler||";
    const ranges = findSpoilerRanges(text);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(
      text.slice(ranges[0].from, ranges[0].to),
      "||actual spoiler||",
    );
  });

  await t.test("handles multiple spoilers in same string", () => {
    const text = "||first|| and ||second||";
    const ranges = findSpoilerRanges(text);
    assert.strictEqual(ranges.length, 2);
    assert.strictEqual(text.slice(ranges[0].from, ranges[0].to), "||first||");
    assert.strictEqual(text.slice(ranges[1].from, ranges[1].to), "||second||");
  });

  await t.test("ignores unclosed delimiters and empty spoilers", () => {
    assert.strictEqual(findSpoilerRanges("||unclosed text").length, 0);
    assert.strictEqual(findSpoilerRanges("||||").length, 0);
  });

  await t.test(
    "isRangeInCodeNode returns false when no syntax tree is present",
    () => {
      const state = EditorState.create({ doc: "||spoiler|| and some code" });
      const inCode = isRangeInCodeNode(state, 0, 11);
      assert.strictEqual(inCode, false);
    },
  );

  await t.test(
    "getSpoilerFragments generates single fragment with start and end caps",
    () => {
      const docText = "Hello ||secret|| world";
      const state = EditorState.create({ doc: docText });
      const fragments = getSpoilerFragments(state, 8, 14, 1);

      assert.strictEqual(fragments.length, 1);
      assert.strictEqual(fragments[0].from, 8);
      assert.strictEqual(fragments[0].to, 14);
      assert.strictEqual(fragments[0].isStart, true);
      assert.strictEqual(fragments[0].isEnd, true);
      assert.ok(fragments[0].classes.includes("discord-syntax-spoiler-single"));
    },
  );

  await t.test(
    "buildSpoilerDecorations creates decorations with cap classes and data-spoiler-id",
    () => {
      const docText = "Hello ||secret|| world";
      const mockState = EditorState.create({ doc: docText });
      const mockView = {
        state: mockState,
        visibleRanges: [{ from: 0, to: docText.length }],
      } as unknown as EditorView;

      const decorations = buildSpoilerDecorations(mockView);
      assert.ok(decorations);

      interface DecoItem {
        from: number;
        to: number;
        value: { spec: { class: string; attributes: Record<string, string> } };
      }
      const items: DecoItem[] = [];
      const iter = decorations.iter();
      while (iter.value !== null) {
        items.push({
          from: iter.from,
          to: iter.to,
          value: iter.value,
        });
        iter.next();
      }

      assert.strictEqual(items.length, 3);
      assert.strictEqual(items[0].from, 6);
      assert.strictEqual(items[0].to, 8);
      assert.strictEqual(items[1].from, 8);
      assert.strictEqual(items[1].to, 14);
      assert.strictEqual(items[2].from, 14);
      assert.strictEqual(items[2].to, 16);

      const contentDeco = items[1].value;
      assert.ok(contentDeco.spec.class.includes("discord-syntax-spoiler"));
      assert.strictEqual(
        contentDeco.spec.attributes["data-spoiler-id"],
        "spoiler-6",
      );
    },
  );

  await t.test(
    "isSelectionInSpoiler detects when cursor/selection is inside spoiler range",
    () => {
      const docText = "Hello ||secret|| world";
      // Cursor at pos 0 (outside)
      const stateOutside = EditorState.create({
        doc: docText,
        selection: { anchor: 0 },
      });
      assert.strictEqual(isSelectionInSpoiler(stateOutside, 6, 16), false);

      // Cursor at pos 6 (start of ||secret||)
      const stateStart = EditorState.create({
        doc: docText,
        selection: { anchor: 6 },
      });
      assert.strictEqual(isSelectionInSpoiler(stateStart, 6, 16), true);

      // Cursor at pos 10 (inside secret)
      const stateInside = EditorState.create({
        doc: docText,
        selection: { anchor: 10 },
      });
      assert.strictEqual(isSelectionInSpoiler(stateInside, 6, 16), true);

      // Cursor at pos 16 (end of ||secret||, outside)
      const stateEnd = EditorState.create({
        doc: docText,
        selection: { anchor: 16 },
      });
      assert.strictEqual(isSelectionInSpoiler(stateEnd, 6, 16), false);
    },
  );

  await t.test(
    "buildSpoilerDecorations omits decorations (source mode) when cursor is in spoiler",
    () => {
      const docText = "Hello ||secret|| world";

      // Cursor inside spoiler (pos 10)
      const mockStateInside = EditorState.create({
        doc: docText,
        selection: { anchor: 10 },
      });
      const mockViewInside = {
        state: mockStateInside,
        visibleRanges: [{ from: 0, to: docText.length }],
      } as unknown as EditorView;

      const decorationsInside = buildSpoilerDecorations(mockViewInside);
      const iterInside = decorationsInside.iter();
      assert.strictEqual(iterInside.value, null); // 0 decorations = source mode

      // Cursor outside spoiler (pos 0)
      const mockStateOutside = EditorState.create({
        doc: docText,
        selection: { anchor: 0 },
      });
      const mockViewOutside = {
        state: mockStateOutside,
        visibleRanges: [{ from: 0, to: docText.length }],
      } as unknown as EditorView;

      const decorationsOutside = buildSpoilerDecorations(mockViewOutside);
      const itemsOutside = [];
      const iterOutside = decorationsOutside.iter();
      while (iterOutside.value !== null) {
        itemsOutside.push(iterOutside.value);
        iterOutside.next();
      }
      assert.strictEqual(itemsOutside.length, 3); // 3 decorations = rendered spoiler mode
    },
  );

  await t.test("styles.css contains spoiler rules for Source Mode", () => {
    const possiblePaths = [
      path.join(process.cwd(), "styles.css"),
      path.join(process.cwd(), "packages/obsidian/styles.css"),
      path.join(process.cwd(), "packages/obsidian/src/styles.css"),
      path.join(__dirname, "../styles.css"),
      path.join(__dirname, "../src/styles.css"),
    ];
    const cssPath =
      possiblePaths.find((p) => fs.existsSync(p)) ?? possiblePaths[0];
    const css = fs.readFileSync(cssPath, "utf8");
    assert.ok(css.includes("border-radius: 0;"));
    assert.ok(css.includes("discord-syntax-spoiler"));
    assert.ok(css.includes(":not(.is-live-preview)"));
    assert.ok(css.includes("discord-subtext-marker"));
    assert.ok(!css.includes("!important"));
    assert.ok(!css.includes(":has("));
    assert.ok(css.includes("text-decoration: none;"));
  });
});
