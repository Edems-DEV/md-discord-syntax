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
  if (!text || text.length < 5) return spoilers;

  const codeRanges = findCodeRanges(text);
  const isCode = (pos: number) => isPosInCode(pos, codeRanges);

  const delimiterIndices: number[] = [];
  let idx = text.indexOf("||");
  while (idx !== -1) {
    if (!isCode(idx) && !isCode(idx + 1)) {
      delimiterIndices.push(idx);
    }
    idx = text.indexOf("||", idx + 2);
  }

  let i = 0;
  while (i < delimiterIndices.length - 1) {
    const startIdx = delimiterIndices[i];
    const endIdx = delimiterIndices[i + 1];

    const content = text.slice(startIdx + 2, endIdx);
    const crossesFencedCode = codeRanges.some(
      (r) => r.isFenced && startIdx < r.from && endIdx > r.to,
    );

    if (!crossesFencedCode && content.length > 0) {
      spoilers.push({
        from: baseOffset + startIdx,
        to: baseOffset + endIdx + 2,
        contentFrom: baseOffset + startIdx + 2,
        contentTo: baseOffset + endIdx,
      });
      i += 2;
    } else {
      i += 1;
    }
  }

  return spoilers;
}
