export function processSpoilers(element: HTMLElement, doc: Document = globalThis.document): void {
  if (!element || !doc) return;

  function createSpoilerSpan(): HTMLSpanElement {
    const spoilerSpan = doc.createElement('span');
    spoilerSpan.classList.add('note-flow-spoiler', 'discord-syntax-spoiler');
    spoilerSpan.setAttribute('role', 'button');
    spoilerSpan.setAttribute('tabindex', '0');
    spoilerSpan.setAttribute('aria-expanded', 'false');
    spoilerSpan.setAttribute('aria-label', 'Spoiler, click to reveal');

    const innerSpan = doc.createElement('span');
    innerSpan.setAttribute('aria-hidden', 'true');

    const originalAppendChild = spoilerSpan.appendChild.bind(spoilerSpan);
    originalAppendChild(innerSpan);

    spoilerSpan.appendChild = function <T extends Node>(node: T): T {
      return innerSpan.appendChild(node);
    };

    function toggleSpoiler() {
      const isRevealed = spoilerSpan.classList.contains('is-revealed');
      if (isRevealed) {
        spoilerSpan.classList.remove('is-revealed');
        spoilerSpan.setAttribute('aria-expanded', 'false');
        spoilerSpan.setAttribute('aria-label', 'Spoiler, click to reveal');
        innerSpan.setAttribute('aria-hidden', 'true');
      } else {
        spoilerSpan.classList.add('is-revealed');
        spoilerSpan.setAttribute('aria-expanded', 'true');
        spoilerSpan.removeAttribute('aria-label');
        innerSpan.setAttribute('aria-hidden', 'false');
      }
    }

    spoilerSpan.addEventListener('click', () => {
      toggleSpoiler();
    });
    spoilerSpan.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSpoiler();
      }
    });
    return spoilerSpan;
  }

  const markers: (HTMLSpanElement | null)[] = [];

  function insertMarker(parent: Node, node: Node, text: string, index: number): Text | null {
    const beforeStr = text.slice(0, index);
    const afterStr = text.slice(index + 2);

    if (beforeStr) {
      parent.insertBefore(doc.createTextNode(beforeStr), node);
    }
    const marker = doc.createElement('span');
    marker.setAttribute('data-spoiler-marker', 'true');
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
      let text = node.nodeValue || '';
      let idx = text.indexOf('||');
      if (idx !== -1 && node.parentNode) {
        const parent = node.parentNode;
        let remainingNode = insertMarker(parent, node, text, idx);
        parent.removeChild(node);
        while (remainingNode) {
          text = remainingNode.nodeValue || '';
          idx = text.indexOf('||');
          if (idx !== -1) {
            const nextRemaining = insertMarker(parent, remainingNode, text, idx);
            parent.removeChild(remainingNode);
            remainingNode = nextRemaining;
          } else {
            remainingNode = null;
          }
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (el.nodeName === 'PRE' || el.nodeName === 'CODE') {
        return;
      }
      if (el.classList.contains('note-flow-spoiler') || el.classList.contains('discord-syntax-spoiler')) {
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
    if (typeof doc.createRange === 'function') {
      try {
        const range = doc.createRange();
        range.setStartAfter(startMarker);
        range.setEndBefore(endMarker);
        const fragment = range.extractContents();
        spoilerSpan.appendChild(fragment);

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
      if (startMarker.parentNode && startMarker.parentNode === endMarker.parentNode) {
        const parent = startMarker.parentNode;
        parent.insertBefore(spoilerSpan, startMarker);

        const children = Array.from(parent.childNodes);
        const startIndex = children.indexOf(startMarker);
        const endIndex = children.indexOf(endMarker);

        for (let j = startIndex + 1; j < endIndex; j++) {
          const child = children[j];
          parent.removeChild(child);
          spoilerSpan.appendChild(child);
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
      marker.parentNode.insertBefore(doc.createTextNode('||'), marker);
      marker.parentNode.removeChild(marker);
    }
  }
}
