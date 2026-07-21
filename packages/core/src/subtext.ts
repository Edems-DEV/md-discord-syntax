export const SUBTEXT_MARKER = "-# ";
export const SUBTEXT_MARKER_LEN = SUBTEXT_MARKER.length;

export function isSubtextLine(lineText: string): boolean {
  return lineText.startsWith(SUBTEXT_MARKER);
}

export function stripSubtextPrefix(lineText: string): string {
  if (isSubtextLine(lineText)) {
    return lineText.slice(SUBTEXT_MARKER_LEN);
  }
  return lineText;
}

export function hasSubtextMarker(text: string): boolean {
  return /(?:^|\n)-# /.test(text);
}
