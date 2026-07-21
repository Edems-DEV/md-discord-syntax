import test from "node:test";
import assert from "node:assert";
import { processSubtextParagraph } from "../src/subtext-post-processor.js";

test("Subtext Reading View Post Processor", async (t) => {
  await t.test(
    "wraps paragraph starting with -# into discord-subtext span",
    () => {
      const mockDocument = {
        createElement(tagName: string) {
          return {
            nodeType: 1,
            tagName: tagName.toUpperCase(),
            classList: {
              add(cls: string) {
                this.classes.push(cls);
              },
              classes: [] as string[],
            },
            children: [] as unknown[],
            appendChild(child: unknown) {
              this.children.push(child);
              return child;
            },
          };
        },
        createTextNode(text: string) {
          const textNode = {
            nodeType: 3,
            data: text,
            ownerDocument: mockDocument,
            cloneNode() {
              return { ...this };
            },
          };
          return textNode;
        },
      };

      const initialTextNode = mockDocument.createTextNode("-# This is subtext");

      const children: unknown[] = [initialTextNode];
      const p = {
        nodeType: 1,
        tagName: "P",
        ownerDocument: mockDocument,
        childNodes: children,
        createEl(tagName: string, options: { cls?: string }) {
          const span = mockDocument.createElement(tagName);
          if (options.cls) {
            span.classList.add(options.cls);
          }
          children.push(span);
          return span;
        },
        empty() {
          children.length = 0;
        },
        appendChild(child: unknown) {
          children.push(child);
          return child;
        },
      } as unknown as HTMLElement;

      processSubtextParagraph(p);

      assert.strictEqual(children.length, 1);
      const span = children[0] as Record<string, unknown>;
      assert.strictEqual(span.tagName, "SPAN");
      const classes = (span.classList as { classes: string[] }).classes;
      assert.ok(classes.includes("discord-subtext"));
      const firstChild = (span.children as { data: string }[])[0];
      assert.strictEqual(firstChild.data, "This is subtext");
    },
  );

  await t.test("ignores regular paragraph without subtext marker", () => {
    const initialTextNode = {
      nodeType: 3,
      data: "This is a normal paragraph",
    };

    const children: unknown[] = [initialTextNode];
    const p = {
      nodeType: 1,
      tagName: "P",
      childNodes: children,
      empty() {
        children.length = 0;
      },
      appendChild(child: unknown) {
        children.push(child);
        return child;
      },
    } as unknown as HTMLElement;

    processSubtextParagraph(p);

    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0], initialTextNode);
  });
});
