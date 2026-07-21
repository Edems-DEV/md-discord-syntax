import {
  isSubtextLine,
  stripSubtextPrefix,
  hasSubtextMarker,
} from "@edems-dev/md-discord-syntax-core";

const SUBTEXT_CLASS = "discord-subtext";

export function processSubtextParagraph(p: HTMLElement): void {
  if (!paragraphMightHaveSubtext(p)) return;

  const children = Array.from(p.childNodes);
  const lines = splitIntoLines(children);

  const hasAny = lines.some((line) => lineIsSubtext(line));
  if (!hasAny) return;

  emptyContainer(p);

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.length === 0) continue;

    if (lineIsSubtext(line)) {
      const clone = cloneLine(line);
      stripMarkerFromFirstText(clone);
      const span = p.createEl("span", { cls: SUBTEXT_CLASS });
      for (const node of clone) span.appendChild(node);
    } else {
      for (const node of line) p.appendChild(node);
    }
  }
}

function emptyContainer(el: HTMLElement): void {
  const emptyable = el as unknown as { empty?: () => void };
  if (typeof emptyable.empty === "function") {
    emptyable.empty();
  } else {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }
}

const TEXT_NODE_TYPE = typeof Node !== "undefined" ? Node.TEXT_NODE : 3;
const ELEMENT_NODE_TYPE = typeof Node !== "undefined" ? Node.ELEMENT_NODE : 1;

function paragraphMightHaveSubtext(p: HTMLElement): boolean {
  for (const child of Array.from(p.childNodes)) {
    if (child.nodeType === TEXT_NODE_TYPE) {
      const v = (child as Text).data;
      if (hasSubtextMarker(v)) return true;
    }
    if (
      child.nodeType === ELEMENT_NODE_TYPE &&
      (child as Element).tagName === "BR"
    ) {
      return true;
    }
  }
  return false;
}

function splitIntoLines(nodes: ChildNode[]): ChildNode[][] {
  const lines: ChildNode[][] = [[]];

  for (const node of nodes) {
    if (node.nodeType === TEXT_NODE_TYPE) {
      const text = node as Text;
      const parts = text.data.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > 0) {
          const frag = text.ownerDocument.createTextNode(parts[i]);
          lines[lines.length - 1].push(frag);
        }
        if (i < parts.length - 1) {
          lines.push([]);
        }
      }
    } else if (
      node.nodeType === ELEMENT_NODE_TYPE &&
      (node as Element).tagName === "BR"
    ) {
      lines[lines.length - 1].push(node);
      lines.push([]);
    } else {
      lines[lines.length - 1].push(node);
    }
  }

  return lines;
}

function lineIsSubtext(line: ChildNode[]): boolean {
  for (const node of line) {
    if (node.nodeType === TEXT_NODE_TYPE) {
      return isSubtextLine((node as Text).data);
    }
    if (
      node.nodeType === ELEMENT_NODE_TYPE &&
      (node as Element).tagName === "BR"
    )
      continue;
    return false;
  }
  return false;
}

function cloneLine(line: ChildNode[]): Node[] {
  return line.map((n) => n.cloneNode(true));
}

function stripMarkerFromFirstText(nodes: Node[]): void {
  for (const node of nodes) {
    if (node.nodeType === TEXT_NODE_TYPE) {
      const t = node as Text;
      if (isSubtextLine(t.data)) {
        t.data = stripSubtextPrefix(t.data);
      }
      return;
    }
    if (
      node.nodeType === ELEMENT_NODE_TYPE &&
      (node as Element).tagName === "BR"
    )
      continue;
    return;
  }
}
