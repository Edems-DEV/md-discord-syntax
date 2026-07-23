import { visit } from "unist-util-visit";
import {
  findSpoilerRanges,
  hasSubtextMarker,
  isSubtextLine,
  stripSubtextPrefix,
} from "@edems-dev/md-discord-syntax-core";

export interface UnistNode {
  type: string;
  name?: string;
  value?: string;
  children?: UnistNode[];
  attributes?: Array<{ type: string; name: string; value: string }>;
  data?: Record<string, unknown>;
}

const SPOILER_ATTRIBUTES: NonNullable<UnistNode["attributes"]> = [
  { type: "mdxJsxAttribute", name: "role", value: "button" },
  { type: "mdxJsxAttribute", name: "tabIndex", value: "0" },
  { type: "mdxJsxAttribute", name: "aria-expanded", value: "false" },
  {
    type: "mdxJsxAttribute",
    name: "aria-label",
    value: "Spoiler, activate to reveal",
  },
];

function createSpoilerProperties(): Record<string, unknown> {
  return {
    className: ["discord-syntax-spoiler", "discord-spoiler"],
    "data-spoiler": "true",
    role: "button",
    tabIndex: 0,
    "aria-expanded": "false",
    "aria-label": "Spoiler, activate to reveal",
    onclick:
      "this.classList.toggle('revealed');this.setAttribute('aria-expanded',this.classList.contains('revealed')?'true':'false')",
    onkeydown:
      "if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}",
  };
}

function normalizeChildren(nodes?: UnistNode[]): UnistNode[] {
  if (!nodes || !Array.isArray(nodes)) return [];
  const result: UnistNode[] = [];
  for (const child of nodes) {
    if (!child) continue;
    if (child.type === "text") {
      if (!child.value) continue;
      if (result.length > 0 && result[result.length - 1].type === "text") {
        result[result.length - 1].value += child.value;
        continue;
      }
    }
    result.push(child);
  }
  return result;
}

function getTextContent(node: UnistNode): string {
  if (node.type === "text") return node.value || "";
  if (node.type === "inlineCode") return "`" + (node.value || "") + "`";
  if (Array.isArray(node.children)) {
    return node.children.map(getTextContent).join("");
  }
  return "";
}

export function remarkMdDiscordSyntax() {
  return (tree: UnistNode): void => {
    // 0. Multi-paragraph Block Spoilers at root level
    if (tree.type === "root" && Array.isArray(tree.children)) {
      const children = tree.children;
      let i = 0;
      while (i < children.length) {
        const first = children[i];
        if (
          first &&
          first.type === "paragraph" &&
          first.children &&
          first.children.length > 0 &&
          first.children[0].type === "text" &&
          first.children[0].value
        ) {
          const firstVal = first.children[0].value;
          if (/^\s*\|\|\s*(\n|$)/.test(firstVal)) {
            // Found block spoiler start candidate
            let endIdx = -1;
            for (let j = i + 1; j < children.length; j++) {
              const last = children[j];
              if (
                last &&
                last.type === "paragraph" &&
                last.children &&
                last.children.length > 0
              ) {
                const lastTextNode = last.children[last.children.length - 1];
                if (
                  lastTextNode &&
                  lastTextNode.type === "text" &&
                  lastTextNode.value &&
                  /(\n|^)\s*\|\|\s*$/.test(lastTextNode.value)
                ) {
                  endIdx = j;
                  break;
                }
              }
            }

            if (endIdx !== -1) {
              // Strip opening || from first paragraph
              first.children[0].value = first.children[0].value.replace(
                /^\s*\|\|\s*\n?/,
                "",
              );
              // Strip closing || from last paragraph
              const lastPara = children[endIdx];
              const lastTextNode =
                lastPara.children![lastPara.children!.length - 1];
              lastTextNode.value = lastTextNode.value!.replace(
                /\n?\s*\|\|\s*$/,
                "",
              );

              const insideBlocks = children
                .slice(i, endIdx + 1)
                .filter((block) => {
                  if (block.type === "paragraph" && block.children) {
                    block.children = normalizeChildren(block.children);
                    return block.children.length > 0;
                  }
                  return true;
                });

              const spoilerBlock: UnistNode = {
                type: "mdxJsxFlowElement",
                name: "Spoiler",
                attributes: SPOILER_ATTRIBUTES.map((attribute) => ({
                  ...attribute,
                })),
                children: insideBlocks,
                data: {
                  _isGenerated: true,
                  hName: "div",
                  hProperties: {
                    ...createSpoilerProperties(),
                    className: [
                      "discord-syntax-spoiler",
                      "discord-spoiler",
                      "discord-spoiler-block",
                    ],
                  },
                },
              };

              children.splice(i, endIdx - i + 1, spoilerBlock);
              i++;
              continue;
            }
          }
        }
        i++;
      }
    }

    // 1. Spoilers (Inline)
    visit(tree as never, (node: UnistNode) => {
      if (
        !node.children ||
        !Array.isArray(node.children) ||
        node.children.length === 0
      )
        return;
      if (
        node.type === "code" ||
        node.type === "inlineCode" ||
        node.name === "Spoiler" ||
        (node.data && node.data._isGenerated)
      )
        return;

      // Construct full text and mapping for marker validation
      let fullText = "";
      for (const child of node.children) {
        fullText += getTextContent(child);
      }

      const validRanges = findSpoilerRanges(fullText);
      if (validRanges.length === 0) return;

      const validPositions = new Set<number>();
      for (const r of validRanges) {
        if (!r.isBlock) {
          validPositions.add(r.from);
          validPositions.add(r.to - 2);
        }
      }

      if (validPositions.size === 0) return;

      const expanded: UnistNode[] = [];
      let hasMarker = false;
      let currentOffset = 0;

      for (const child of node.children) {
        if (
          child.type === "text" &&
          child.value &&
          child.value.includes("||")
        ) {
          let text = child.value;
          let searchFrom = 0;
          let idx = text.indexOf("||", searchFrom);
          while (idx !== -1) {
            const absPos = currentOffset + idx;
            if (validPositions.has(absPos)) {
              const before = text.slice(0, idx);
              if (before) expanded.push({ type: "text", value: before });
              expanded.push({ type: "spoiler-marker" });
              hasMarker = true;
              text = text.slice(idx + 2);
              currentOffset = absPos + 2;
              searchFrom = 0;
              idx = text.indexOf("||", searchFrom);
            } else {
              searchFrom = idx + 2;
              idx = text.indexOf("||", searchFrom);
            }
          }
          if (text) expanded.push({ type: "text", value: text });
          currentOffset += text.length;
        } else {
          currentOffset += getTextContent(child).length;
          expanded.push(child);
        }
      }

      if (!hasMarker) return;

      const markerIndices: number[] = [];
      for (let i = 0; i < expanded.length; i++) {
        if (expanded[i].type === "spoiler-marker") {
          markerIndices.push(i);
        }
      }

      if (markerIndices.length < 2) {
        const restored = expanded.map((n) =>
          n.type === "spoiler-marker" ? { type: "text", value: "||" } : n,
        );
        node.children = normalizeChildren(restored);
        return;
      }

      const pairs: Array<{ start: number; end: number }> = [];
      for (let k = 0; k < markerIndices.length - 1; k += 2) {
        pairs.push({ start: markerIndices[k], end: markerIndices[k + 1] });
      }

      const result: UnistNode[] = [];
      let currentIndex = 0;

      for (const pair of pairs) {
        while (currentIndex < pair.start) {
          const n = expanded[currentIndex];
          result.push(
            n.type === "spoiler-marker" ? { type: "text", value: "||" } : n,
          );
          currentIndex++;
        }

        const rawInside = expanded.slice(pair.start + 1, pair.end);
        const inside = rawInside.map((n) =>
          n.type === "spoiler-marker" ? { type: "text", value: "||" } : n,
        );
        const normalizedInside = normalizeChildren(inside);

        result.push({
          type: "mdxJsxTextElement",
          name: "Spoiler",
          attributes: SPOILER_ATTRIBUTES.map((attribute) => ({
            ...attribute,
          })),
          children: normalizedInside,
          data: {
            _isGenerated: true,
            hName: "span",
            hProperties: createSpoilerProperties(),
          },
        });

        currentIndex = pair.end + 1;
      }

      while (currentIndex < expanded.length) {
        const n = expanded[currentIndex];
        result.push(
          n.type === "spoiler-marker" ? { type: "text", value: "||" } : n,
        );
        currentIndex++;
      }

      node.children = normalizeChildren(result);
    });

    // 2. Subtext
    visit(tree as never, "paragraph", (node: UnistNode) => {
      if (!node.children) return;

      let mightHaveSubtext = false;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (
          child.type === "text" &&
          child.value &&
          hasSubtextMarker(child.value)
        ) {
          mightHaveSubtext = true;
          break;
        }
        if (child.type === "break" && i + 1 < node.children.length) {
          const next = node.children[i + 1];
          if (next.type === "text" && next.value && isSubtextLine(next.value)) {
            mightHaveSubtext = true;
            break;
          }
        }
      }
      if (!mightHaveSubtext) return;

      const lines: UnistNode[][] = [];
      let currentLine: UnistNode[] = [];
      lines.push(currentLine);

      for (const child of node.children) {
        if (child.type === "break") {
          currentLine.push(child);
          currentLine = [];
          lines.push(currentLine);
        } else if (child.type === "text" && child.value !== undefined) {
          const parts = child.value.split("\n");
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].length > 0) {
              currentLine.push({ type: "text", value: parts[i] });
            }
            if (i < parts.length - 1) {
              currentLine = [];
              lines.push(currentLine);
            }
          }
        } else {
          currentLine.push(child);
        }
      }

      const newChildren: UnistNode[] = [];
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (line.length === 0) continue;

        let firstTextIndex = -1;
        for (let i = 0; i < line.length; i++) {
          if (line[i].type === "text") {
            if (line[i].value !== "") {
              firstTextIndex = i;
              break;
            }
          } else {
            break;
          }
        }

        let isSubtext = false;
        if (firstTextIndex !== -1) {
          const val = line[firstTextIndex].value;
          if (val && isSubtextLine(val)) {
            isSubtext = true;
            line[firstTextIndex].value = stripSubtextPrefix(val);
          }
        }

        if (isSubtext) {
          const filteredLine = line.filter(
            (n) => !(n.type === "text" && n.value === ""),
          );
          if (filteredLine.length > 0) {
            newChildren.push({
              type: "mdxJsxTextElement",
              name: "span",
              attributes: [
                {
                  type: "mdxJsxAttribute",
                  name: "data-subtext",
                  value: "true",
                },
              ],
              children: filteredLine,
              data: {
                _isGenerated: true,
                hName: "span",
                hProperties: {
                  "data-subtext": "true",
                  className: ["discord-syntax-subtext", "discord-subtext"],
                },
              },
            });
          }
        } else {
          newChildren.push(...line);
        }

        if (li < lines.length - 1) {
          newChildren.push({ type: "text", value: "\n" });
        }
      }
      node.children = newChildren;
    });
  };
}

export { remarkMdDiscordSyntax as remarkDiscordSyntax };

export default remarkMdDiscordSyntax;
