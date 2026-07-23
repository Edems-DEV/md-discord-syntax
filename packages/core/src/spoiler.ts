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
  const fencedLines = new Array<boolean>(lines.length).fill(false);
  let currentOffset = 0;
  let inFence = false;
  let fenceChar = "";
  let fenceLen = 0;
  let fenceStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentOffset;
    const lineEnd = currentOffset + line.length;
    let lineHasFence = inFence;

    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const matchStr = fenceMatch[1];
      const char = matchStr[0];
      const len = matchStr.length;
      const trailing = fenceMatch[2];

      if (!inFence && (char !== "`" || !trailing.includes("`"))) {
        inFence = true;
        lineHasFence = true;
        fenceChar = char;
        fenceLen = len;
        fenceStart = lineStart;
      } else if (
        inFence &&
        char === fenceChar &&
        len >= fenceLen &&
        /^[ \t\r]*$/.test(trailing)
      ) {
        lineHasFence = true;
        inFence = false;
        codeRanges.push({ from: fenceStart, to: lineEnd, isFenced: true });
      }
    }

    fencedLines[i] = lineHasFence;

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

    if (!fencedLines[i]) {
      const backtickRegex = /(`+)/g;
      let match: RegExpExecArray | null;
      let openBacktick: { len: number; index: number } | null = null;

      while ((match = backtickRegex.exec(line)) !== null) {
        const len = match[1].length;
        const index = lineStart + match.index;

        if (!openBacktick) {
          if (isEscaped(text, index)) continue;
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

  codeRanges.sort((a, b) => a.from - b.from);
  return codeRanges;
}

export function isPosInCode(pos: number, codeRanges: CodeRange[]): boolean {
  return codeRanges.some((r) => pos >= r.from && pos < r.to);
}

function isPosInSortedRanges(
  pos: number,
  ranges: Array<{ from: number; to: number }>,
): boolean {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const range = ranges[mid];
    if (pos < range.from) {
      high = mid - 1;
    } else if (pos >= range.to) {
      low = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

function hasRangeBetween(
  from: number,
  to: number,
  ranges: Array<{ from: number; to: number; isFenced?: boolean }>,
): boolean {
  let low = 0;
  let high = ranges.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (ranges[mid].from <= from) low = mid + 1;
    else high = mid;
  }
  const range = ranges[low];
  return Boolean(range && range.isFenced && range.to < to);
}

function hasPositionBetween(
  from: number,
  to: number,
  positions: number[],
): boolean {
  let low = 0;
  let high = positions.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (positions[mid] < from) low = mid + 1;
    else high = mid;
  }
  return low < positions.length && positions[low] < to;
}

export function findSpoilerRanges(
  text: string,
  baseOffset = 0,
): SpoilerRange[] {
  const spoilers: SpoilerRange[] = [];
  if (!text || text.length < 4) return spoilers;

  const codeRanges = findCodeRanges(text);
  const fencedCodeRanges = codeRanges.filter((range) => range.isFenced);
  const isCode = (pos: number) => isPosInSortedRanges(pos, codeRanges);

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

  const isInBlock = (pos: number) => isPosInSortedRanges(pos, blockRanges);

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

  const nextClosing = new Array<number>(candidates.length).fill(-1);
  const paragraphBreaks: number[] = [];
  for (let breakIndex = text.indexOf("\n\n"); breakIndex !== -1;) {
    paragraphBreaks.push(breakIndex);
    breakIndex = text.indexOf("\n\n", breakIndex + 2);
  }
  for (let breakIndex = text.indexOf("\r\n\r\n"); breakIndex !== -1;) {
    paragraphBreaks.push(breakIndex);
    breakIndex = text.indexOf("\r\n\r\n", breakIndex + 4);
  }
  paragraphBreaks.sort((a, b) => a - b);

  let nearestClosing = -1;
  for (
    let candidateIndex = candidates.length - 1;
    candidateIndex >= 0;
    candidateIndex--
  ) {
    nextClosing[candidateIndex] = nearestClosing;
    const prevChar = text[candidates[candidateIndex] - 1];
    if (prevChar && !/\s/.test(prevChar)) {
      nearestClosing = candidateIndex;
    }
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

    let j = nextClosing[i];
    while (j !== -1 && candidates[j] <= startIdx + 2) {
      j = nextClosing[j];
    }
    if (j === -1) {
      i++;
      continue;
    }

    const endIdx = candidates[j];
    if (
      hasPositionBetween(startIdx + 2, endIdx, paragraphBreaks) ||
      hasRangeBetween(startIdx, endIdx, fencedCodeRanges)
    ) {
      i++;
      continue;
    }

    spoilers.push({
      from: baseOffset + startIdx,
      to: baseOffset + endIdx + 2,
      contentFrom: baseOffset + startIdx + 2,
      contentTo: baseOffset + endIdx,
      isBlock: false,
    });
    i = j + 1;
  }

  spoilers.sort((a, b) => a.from - b.from);
  return spoilers;
}
