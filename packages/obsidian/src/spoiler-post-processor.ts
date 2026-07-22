import { findSpoilerRanges } from "@edems-dev/md-discord-syntax-core";

export function processSpoilers(
  element: HTMLElement,
  doc: Document = element.ownerDocument,
): void {
  const fullText = element.textContent || "";
  const validRanges = findSpoilerRanges(fullText);
  if (validRanges.length === 0) return;

  const validPositions = new Set<number>();
  for (const r of validRanges) {
    validPositions.add(r.from);
    validPositions.add(r.to - 2);
  }

  function createSpoilerSpan(): HTMLSpanElement {
    const spoilerSpan = element.createEl("span", {
      cls: "note-flow-spoiler discord-syntax-spoiler",
      attr: {
        role: "button",
        tabindex: "0",
        "aria-expanded": "false",
        "aria-label": "Spoiler, click to reveal",
      },
    });
    if (spoilerSpan.parentNode) {
      spoilerSpan.parentNode.removeChild(spoilerSpan);
    }

    const innerSpan = spoilerSpan.createEl("span", {
      attr: {
        "aria-hidden": "true",
      },
    });

    function toggleSpoiler() {
      const isRevealed = spoilerSpan.classList.contains("is-revealed");
      if (isRevealed) {
        spoilerSpan.classList.remove("is-revealed");
        spoilerSpan.setAttribute("aria-expanded", "false");
        spoilerSpan.setAttribute("aria-label", "Spoiler, click to reveal");
        innerSpan.setAttribute("aria-hidden", "true");
      } else {
        spoilerSpan.classList.add("is-revealed");
        spoilerSpan.setAttribute("aria-expanded", "true");
        spoilerSpan.removeAttribute("aria-label");
        innerSpan.setAttribute("aria-hidden", "false");
      }
    }

    spoilerSpan.addEventListener("click", () => {
      toggleSpoiler();
    });
    spoilerSpan.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSpoiler();
      }
    });
    return spoilerSpan;
  }

  const markers: (HTMLSpanElement | null)[] = [];
  let currentPos = 0;

  function insertMarker(
    parent: Node,
    node: Node,
    text: string,
    index: number,
  ): Text | null {
    const beforeStr = text.slice(0, index);
    const afterStr = text.slice(index + 2);

    if (beforeStr) {
      parent.insertBefore(doc.createTextNode(beforeStr), node);
    }
    const marker = element.createEl("span", {
      attr: { "data-spoiler-marker": "true" },
    });
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
    parent.insertBefore(marker, node);
    markers.push(marker);

    if (afterStr) {
      const afterNode = doc.createTextNode(afterStr);
      parent.insertBefore(afterNode, node);
      return afterNode;
    }
    return null;
  }

  function collectMarkers(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      let text = node.nodeValue || "";
      let searchFrom = 0;
      let idx = text.indexOf("||", searchFrom);

      if (idx !== -1 && node.parentNode) {
        const parent = node.parentNode;
        let remainingNode: Text | null = node as Text;

        while (remainingNode && idx !== -1) {
          const absPos = currentPos + idx;
          if (validPositions.has(absPos)) {
            const nextRemaining = insertMarker(
              parent,
              remainingNode,
              text,
              idx,
            );
            parent.removeChild(remainingNode);
            remainingNode = nextRemaining;
            currentPos = absPos + 2;
            text = remainingNode ? remainingNode.nodeValue || "" : "";
            searchFrom = 0;
            idx = text ? text.indexOf("||", searchFrom) : -1;
          } else {
            searchFrom = idx + 2;
            idx = text.indexOf("||", searchFrom);
          }
        }
        if (remainingNode) {
          currentPos += (remainingNode.nodeValue || "").length;
        }
      } else {
        currentPos += text.length;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.nodeName === "PRE" || el.nodeName === "CODE") {
        return;
      }
      if (
        el.classList.contains("note-flow-spoiler") ||
        el.classList.contains("discord-syntax-spoiler")
      ) {
        return;
      }

      for (const child of Array.from(node.childNodes)) {
        collectMarkers(child);
      }
    }
  }

  collectMarkers(element);

  for (let i = 0; i < markers.length - 1; i += 2) {
    const startMarker = markers[i];
    const endMarker = markers[i + 1];

    if (!startMarker || !endMarker) continue;

    const spoilerSpan = createSpoilerSpan();

    let usedRange = false;
    if (typeof doc.createRange === "function") {
      try {
        const range = doc.createRange();
        range.setStartAfter(startMarker);
        range.setEndBefore(endMarker);
        const fragment = range.extractContents();
        spoilerSpan.firstElementChild?.appendChild(fragment);

        if (startMarker.parentNode) {
          startMarker.parentNode.insertBefore(spoilerSpan, startMarker);
          startMarker.parentNode.removeChild(startMarker);
        }
        if (endMarker.parentNode) {
          endMarker.parentNode.removeChild(endMarker);
        }
        markers[i] = null;
        markers[i + 1] = null;
        usedRange = true;
      } catch {
        usedRange = false;
      }
    }

    if (!usedRange) {
      if (
        startMarker.parentNode &&
        startMarker.parentNode === endMarker.parentNode
      ) {
        const parent = startMarker.parentNode;
        parent.insertBefore(spoilerSpan, startMarker);

        const children = Array.from(parent.childNodes);
        const startIndex = children.indexOf(startMarker);
        const endIndex = children.indexOf(endMarker);

        for (let j = startIndex + 1; j < endIndex; j++) {
          const child = children[j];
          parent.removeChild(child);
          spoilerSpan.firstElementChild?.appendChild(child);
        }

        parent.removeChild(startMarker);
        parent.removeChild(endMarker);

        markers[i] = null;
        markers[i + 1] = null;
      }
    }
  }

  for (const marker of markers) {
    if (marker && marker.parentNode) {
      marker.parentNode.insertBefore(doc.createTextNode("||"), marker);
      marker.parentNode.removeChild(marker);
    }
  }
}
