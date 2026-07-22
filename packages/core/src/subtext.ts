export const SUBTEXT_MARKER = "-# ";
export const SUBTEXT_MARKER_LEN = SUBTEXT_MARKER.length;

export const SUBTEXT_LINE_REGEX =
  /^(?:\s*>\s*)*(?:\s*(?:[-*+]|\d+\.|-\s*\[[ xX]\])\s+)?\s*-# /;

export interface SubtextLineParseResult {
  prefix: string;
  marker: string;
  content: string;
}

export function parseSubtextLine(
  lineText: string,
): SubtextLineParseResult | null {
  const match = lineText.match(SUBTEXT_LINE_REGEX);
  if (!match) return null;

  const fullMatched = match[0];
  const markerIdx = fullMatched.lastIndexOf(SUBTEXT_MARKER);
  if (markerIdx === -1) return null;

  const prefix = lineText.slice(0, markerIdx);
  const marker = SUBTEXT_MARKER;
  const content = lineText.slice(markerIdx + SUBTEXT_MARKER_LEN);

  return { prefix, marker, content };
}

export function isSubtextLine(lineText: string): boolean {
  return SUBTEXT_LINE_REGEX.test(lineText);
}

export function stripSubtextPrefix(lineText: string): string {
  const parsed = parseSubtextLine(lineText);
  if (parsed) {
    return parsed.prefix + parsed.content;
  }
  return lineText;
}

export function hasSubtextMarker(text: string): boolean {
  return (
    /(?:^|\n)(?:\s*>\s*)*(?:\s*(?:[-*+]|\d+\.|-\s*\[[ xX]\])\s+)?\s*-# /.test(
      text,
    )
  );
}

