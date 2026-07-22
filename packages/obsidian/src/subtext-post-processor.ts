import {
  isSubtextLine,
  stripSubtextPrefix,
  hasSubtextMarker,
} from "@edems-dev/md-discord-syntax-core";

const SUBTEXT_CLASS = "discord-subtext";

export function processSubtextParagraph(el: HTMLElement): void {
  const blockSelector = "p, ul, ol, div, blockquote";
  const finder = el as HTMLElement & {
    find?: (s: string) => HTMLElement | null;
  };
  const hasChildBlock =
    typeof finder.find === "function" && finder.find(blockSelector) !== null;
  if (hasChildBlock) {
    return;
  }

  if (!elementMightHaveSubtext(el)) return;

  const children = Array.from(el.childNodes);
  const lines = splitIntoLines(children);

  const hasAny = lines.some((line) => lineIsSubtext(line));
  if (!hasAny) return;

  emptyContainer(el);

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (line.length === 0) continue;

    if (lineIsSubtext(line)) {
      const clone = cloneLine(line);
      stripMarkerFromFirstText(clone);

      const controls: Node[] = [];
      const subtextNodes: Node[] = [];
      for (const node of clone) {
        if (
          node.nodeType === ELEMENT_NODE_TYPE &&
          ((node as Element).tagName === "INPUT" ||
            (node as Element).classList?.contains("task-list-item-checkbox"))
        ) {
          controls.push(node);
        } else {
          subtextNodes.push(node);
        }
      }

      for (const ctrl of controls) {
        el.appendChild(ctrl);
      }

      if (subtextNodes.length > 0) {
        const span = createSpanElement(el, SUBTEXT_CLASS);
        for (const node of subtextNodes) span.appendChild(node);
      }
    } else {
      for (const node of line) el.appendChild(node);
    }
  }
}

function createSpanElement(parent: HTMLElement, cls: string): HTMLElement {
  if (typeof parent.createSpan === "function") {
    return parent.createSpan({ cls });
  }
  if (typeof parent.createEl === "function") {
    return parent.createEl("span", { cls });
  }
  const ownerDoc = parent.ownerDocument;
  if (ownerDoc && typeof ownerDoc.createElement === "function") {
    const span = ownerDoc.createElement("span");
    span.className = cls;
    parent.appendChild(span);
    return span;
  }
  return parent;
}

function emptyContainer(el: HTMLElement): void {
  const emptyable = el as HTMLElement & { empty?: () => void };
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

function elementMightHaveSubtext(el: HTMLElement): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === TEXT_NODE_TYPE) {
      const v = (child as Text).data;
      if (hasSubtextMarker(v)) return true;
    }
    if (child.nodeType === ELEMENT_NODE_TYPE) {
      const elem = child as Element;
      if (
        elem.tagName === "BR" ||
        elem.tagName === "INPUT" ||
        elem.classList?.contains("task-list-item-checkbox")
      ) {
        return true;
      }
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
      const data = (node as Text).data;
      if (isSubtextLine(data)) return true;
      if (data.trim().length === 0) continue;
      return false;
    }
    if (
      node.nodeType === ELEMENT_NODE_TYPE &&
      ((node as Element).tagName === "BR" ||
        (node as Element).tagName === "INPUT" ||
        (node as Element).classList?.contains("task-list-item-checkbox"))
    ) {
      continue;
    }
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
      ((node as Element).tagName === "BR" ||
        (node as Element).tagName === "INPUT" ||
        (node as Element).classList?.contains("task-list-item-checkbox"))
    ) {
      continue;
    }
    return;
  }
}
