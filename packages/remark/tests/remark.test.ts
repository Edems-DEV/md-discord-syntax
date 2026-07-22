import test from "node:test";
import assert from "node:assert";
import { remark } from "remark";
import { remarkMdDiscordSyntax } from "../src/index.js";

interface TestNode {
  type: string;
  name?: string;
  value?: string;
  children?: TestNode[];
  attributes?: Array<{ type: string; name: string; value: string }>;
  data?: Record<string, unknown>;
}

void test("Remark Discord Syntax Plugin", async (t) => {
  const processor = remark().use(remarkMdDiscordSyntax);

  await t.test("transforms discord-style spoilers (plain)", async () => {
    const input = "Here is a ||secret message||.";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const p = newTree.children![0];
    const spoiler = p.children![1];
    assert.strictEqual(spoiler.type, "mdxJsxTextElement");
    assert.strictEqual(spoiler.name, "Spoiler");
    assert.strictEqual(spoiler.children![0].value, "secret message");
    assert.strictEqual(spoiler.data?._isGenerated, true);
    assert.strictEqual(spoiler.data?.hName, "span");
    assert.strictEqual((spoiler.data?.hProperties as Record<string, string>)?.["data-spoiler"], "true");
  });

  await t.test("ignores delimiter text inside code", async () => {
    const input = "Here is `||` some code `||secret||`.";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const p = newTree.children![0];
    assert.strictEqual(p.children!.length, 5);
    assert.strictEqual(p.children![1].type, "inlineCode");
    assert.strictEqual(p.children![1].value, "||");
    assert.strictEqual(p.children![3].type, "inlineCode");
    assert.strictEqual(p.children![3].value, "||secret||");
  });

  await t.test("handles multiple and unmatched spoilers", async () => {
    const input = "||one|| and ||two|| and unmatched || here.";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const p = newTree.children![0];
    assert.strictEqual(p.children![0].type, "mdxJsxTextElement");
    assert.strictEqual(p.children![0].name, "Spoiler");
    assert.strictEqual(p.children![2].type, "mdxJsxTextElement");
    assert.strictEqual(p.children![2].name, "Spoiler");
    assert.strictEqual(p.children![3].value, " and unmatched || here.");
  });

  await t.test(
    "transforms discord-style spoilers with nested formatting and inline code",
    async () => {
      const input = "||hidden *italic*, `inline code`, **bold**||";
      const tree = processor.parse(input);
      const newTree = (await processor.run(tree)) as unknown as TestNode;

      const p = newTree.children![0];
      const spoiler = p.children![0];
      assert.strictEqual(spoiler.type, "mdxJsxTextElement");
      assert.strictEqual(spoiler.name, "Spoiler");
      assert.strictEqual(spoiler.children![0].value, "hidden ");
      assert.strictEqual(spoiler.children![1].type, "emphasis");
      assert.strictEqual(spoiler.children![3].type, "inlineCode");
      assert.strictEqual(spoiler.children![3].value, "inline code");
      assert.strictEqual(spoiler.children![5].type, "strong");
    },
  );

  await t.test("leaves unmatched and spaced delimiters as raw text", async () => {
    const input = "This line has || an incomplete spoiler marker and || spaced ||.";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const p = newTree.children![0];
    assert.strictEqual(p.children![0].value, "This line has || an incomplete spoiler marker and || spaced ||.");
  });

  await t.test("transforms multi-paragraph block spoilers", async () => {
    const input = "||\nFirst paragraph\n\nSecond paragraph\n||";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const spoilerBlock = newTree.children![0];
    assert.strictEqual(spoilerBlock.type, "mdxJsxFlowElement");
    assert.strictEqual(spoilerBlock.name, "Spoiler");
    assert.strictEqual(spoilerBlock.children!.length, 2);
    assert.strictEqual(spoilerBlock.children![0].children![0].value, "First paragraph");
    assert.strictEqual(spoilerBlock.children![1].children![0].value, "Second paragraph");
  });

  await t.test("ignores fenced code blocks", async () => {
    const input = "```\nconst x = ||not a spoiler||;\n```";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const codeNode = newTree.children![0];
    assert.strictEqual(codeNode.type, "code");
    assert.strictEqual(codeNode.value, "const x = ||not a spoiler||;");
  });

  await t.test(
    "transforms consecutive multiline Discord subtext lines",
    async () => {
      const input = "-# Subtext line 1\n-# Subtext line 2\n-# Subtext line 3";
      const tree = processor.parse(input);
      const newTree = (await processor.run(tree)) as unknown as TestNode;

      const p = newTree.children![0];
      assert.strictEqual(p.type, "paragraph");
      assert.strictEqual(p.children![0].name, "span");
      assert.strictEqual(p.children![0].children![0].value, "Subtext line 1");
      assert.strictEqual(p.children![1].value, "\n");
      assert.strictEqual(p.children![2].name, "span");
      assert.strictEqual(p.children![2].children![0].value, "Subtext line 2");
      assert.strictEqual(p.children![3].value, "\n");
      assert.strictEqual(p.children![4].name, "span");
      assert.strictEqual(p.children![4].children![0].value, "Subtext line 3");
    },
  );

  await t.test(
    "transforms Discord subtext at physical line starts",
    async () => {
      const input =
        "-# Subtext line 1\nNormal line\n-# Subtext line 2 with **bold**\n-#foo not subtext";
      const tree = processor.parse(input);
      const newTree = (await processor.run(tree)) as unknown as TestNode;

      const p = newTree.children![0];
      assert.strictEqual(p.type, "paragraph");
      const s1 = p.children![0];
      assert.strictEqual(s1.type, "mdxJsxTextElement");
      assert.strictEqual(s1.name, "span");
      assert.strictEqual(s1.data?._isGenerated, true);
      assert.strictEqual(
        s1.attributes?.find((a) => a.name === "data-subtext")?.value,
        "true",
      );
      assert.strictEqual(s1.children![0].value, "Subtext line 1");

      assert.strictEqual(p.children![1].value, "\n");
      assert.strictEqual(p.children![2].value, "Normal line");
      assert.strictEqual(p.children![3].value, "\n");

      const s2 = p.children![4];
      assert.strictEqual(s2.type, "mdxJsxTextElement");
      assert.strictEqual(s2.name, "span");
      assert.strictEqual(
        s2.attributes?.find((a) => a.name === "data-subtext")?.value,
        "true",
      );
      assert.strictEqual(s2.children![0].value, "Subtext line 2 with ");
      assert.strictEqual(s2.children![1].type, "strong");
      assert.strictEqual(s2.children![1].children![0].value, "bold");

      assert.strictEqual(p.children![5].value, "\n");
      assert.strictEqual(p.children![6].value, "-#foo not subtext");
    },
  );

  await t.test("transforms Discord subtext inside blockquotes / callouts", async () => {
    const input = "> -# Subtext inside callout";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const bq = newTree.children![0];
    assert.strictEqual(bq.type, "blockquote");
    const p = bq.children![0];
    assert.strictEqual(p.type, "paragraph");
    const span = p.children![0];
    assert.strictEqual(span.type, "mdxJsxTextElement");
    assert.strictEqual(span.name, "span");
    assert.strictEqual(span.children![0].value, "Subtext inside callout");
  });

  await t.test("transforms Discord subtext inside unordered and ordered lists", async () => {
    const input = "- -# Bullet subtext\n1. -# Numbered subtext";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const list1 = newTree.children![0];
    assert.strictEqual(list1.type, "list");
    const item1Para = list1.children![0].children![0];
    const span1 = item1Para.children![0];
    assert.strictEqual(span1.type, "mdxJsxTextElement");
    assert.strictEqual(span1.children![0].value, "Bullet subtext");

    const list2 = newTree.children![1];
    assert.strictEqual(list2.type, "list");
    const item2Para = list2.children![0].children![0];
    const span2 = item2Para.children![0];
    assert.strictEqual(span2.type, "mdxJsxTextElement");
    assert.strictEqual(span2.children![0].value, "Numbered subtext");
  });

  await t.test("transforms indented subtext under list item", async () => {
    const input = "- Main item\n  -# Subtext under item";
    const tree = processor.parse(input);
    const newTree = (await processor.run(tree)) as unknown as TestNode;

    const list = newTree.children![0];
    assert.strictEqual(list.type, "list");
    const p = list.children![0].children![0];
    assert.strictEqual(p.children![0].value, "Main item");
    assert.strictEqual(p.children![1].value, "\n");
    const span = p.children![2];
    assert.strictEqual(span.type, "mdxJsxTextElement");
    assert.strictEqual(span.children![0].value, "Subtext under item");
  });
});

