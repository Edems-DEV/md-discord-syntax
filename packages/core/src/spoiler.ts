export interface CodeRange {
  from: number;
  to: number;
  isFenced?: boolean;
}

export interface SpoilerRange {
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
  isBlock?: boolean;
}

export function isEscaped(text: string, pos: number): boolean {
  let count = 0;
  for (let i = pos - 1; i >= 0 && text[i] === "\\"; i--) {
    count++;
  }
  return count % 2 === 1;
}

export function findCodeRanges(text: string): CodeRange[] {
  const codeRanges: CodeRange[] = [];
  if (!text) return codeRanges;

  const lines = text.split("\n");
  let currentOffset = 0;
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;
  let fenceStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentOffset;
    const lineEnd = currentOffset + line.length;

    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const matchStr = fenceMatch[1];
      const char = matchStr[0];
      const len = matchStr.length;

      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLen = len;
        fenceStart = lineStart;
      } else if (char === fenceChar && len >= fenceLen) {
        inFence = false;
        codeRanges.push({ from: fenceStart, to: lineEnd, isFenced: true });
      }
    }

    if (inFence && i === lines.length - 1) {
      codeRanges.push({ from: fenceStart, to: lineEnd, isFenced: true });
    }

    currentOffset = lineEnd + 1;
  }

  currentOffset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentOffset;
    const lineEnd = currentOffset + line.length;

    const isLineInFence = codeRanges.some(
      (r) => lineStart >= r.from && lineEnd <= r.to,
    );

    if (!isLineInFence) {
      const backtickRegex = /(`+)/g;
      let match: RegExpExecArray | null;
      let openBacktick: { len: number; index: number } | null = null;

      while ((match = backtickRegex.exec(line)) !== null) {
        const len = match[1].length;
        const index = lineStart + match.index;

        if (!openBacktick) {
          openBacktick = { len, index };
        } else if (openBacktick.len === len) {
          codeRanges.push({
            from: openBacktick.index,
            to: index + len,
            isFenced: false,
          });
          openBacktick = null;
        }
      }
    }

    currentOffset = lineEnd + 1;
  }

  return codeRanges;
}

export function isPosInCode(pos: number, codeRanges: CodeRange[]): boolean {
  return codeRanges.some((r) => pos >= r.from && pos < r.to);
}

export function findSpoilerRanges(
  text: string,
  baseOffset = 0,
): SpoilerRange[] {
  const spoilers: SpoilerRange[] = [];
  if (!text || text.length < 4) return spoilers;

  const codeRanges = findCodeRanges(text);
  const isCode = (pos: number) => isPosInCode(pos, codeRanges);

  const blockRanges: { from: number; to: number }[] = [];

  // Pass 1: Standalone block spoilers (|| on line by itself)
  const lines = text.split("\n");
  let currentOffset = 0;
  let blockStart: {
    lineIdx: number;
    offset: number;
    contentFrom: number;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentOffset;
    const lineEnd = lineStart + line.length;
    currentOffset = lineEnd + 1;

    if (isCode(lineStart)) continue;

    const blockMarkerMatch = line.match(/^\s*(\|\|)\s*$/);
    if (blockMarkerMatch) {
      const markerPos = lineStart + line.indexOf("||");
      if (!isCode(markerPos) && !isEscaped(text, markerPos)) {
        if (blockStart === null) {
          blockStart = {
            lineIdx: i,
            offset: markerPos,
            contentFrom: lineEnd + 1 <= text.length ? lineEnd + 1 : lineEnd,
          };
        } else {
          const contentTo = lineStart;
          spoilers.push({
            from: baseOffset + blockStart.offset,
            to: baseOffset + markerPos + 2,
            contentFrom: baseOffset + blockStart.contentFrom,
            contentTo: baseOffset + contentTo,
            isBlock: true,
          });
          blockRanges.push({
            from: blockStart.offset,
            to: markerPos + 2,
          });
          blockStart = null;
        }
      }
    }
  }

  const isInBlock = (pos: number) =>
    blockRanges.some((r) => pos >= r.from && pos < r.to);

  // Pass 2: Inline spoilers
  let idx = text.indexOf("||");
  const candidates: number[] = [];
  while (idx !== -1) {
    if (
      !isCode(idx) &&
      !isCode(idx + 1) &&
      !isInBlock(idx) &&
      !isEscaped(text, idx)
    ) {
      candidates.push(idx);
    }
    idx = text.indexOf("||", idx + 2);
  }

  let i = 0;
  while (i < candidates.length - 1) {
    const startIdx = candidates[i];

    // Opening || must not be followed by whitespace
    const nextChar = text[startIdx + 2];
    if (!nextChar || /\s/.test(nextChar)) {
      i++;
      continue;
    }

    let foundMatch = false;
    for (let j = i + 1; j < candidates.length; j++) {
      const endIdx = candidates[j];
      const prevChar = text[endIdx - 1];

      // Closing || must not be preceded by whitespace
      if (/\s/.test(prevChar)) {
        continue;
      }

      const content = text.slice(startIdx + 2, endIdx);

      // Inline spoilers cannot contain double newlines
      if (content.includes("\n\n") || content.includes("\r\n\r\n")) {
        break;
      }

      const crossesFencedCode = codeRanges.some(
        (r) => r.isFenced && startIdx < r.from && endIdx > r.to,
      );
      if (crossesFencedCode) {
        continue;
      }

      if (content.length > 0) {
        spoilers.push({
          from: baseOffset + startIdx,
          to: baseOffset + endIdx + 2,
          contentFrom: baseOffset + startIdx + 2,
          contentTo: baseOffset + endIdx,
          isBlock: false,
        });
        i = j + 1;
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      i++;
    }
  }

  spoilers.sort((a, b) => a.from - b.from);
  return spoilers;
}
