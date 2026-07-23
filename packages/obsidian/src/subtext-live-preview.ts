import {
  ViewPlugin,
  Decoration,
  EditorView,
  ViewUpdate,
  DecorationSet,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import {
  SUBTEXT_MARKER_LEN,
  parseSubtextLine,
} from "@edems-dev/md-discord-syntax-core";

const subtextLineMark = Decoration.mark({ class: "discord-subtext" });

const subtextMarkerMark = Decoration.mark({ class: "discord-subtext-marker" });

const subtextMarkerActiveMark = Decoration.mark({
  class: "discord-subtext-marker-active",
});

export const subtextEditorPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v: { decorations: DecorationSet }) => v.decorations },
);

function collectActiveLineNumbers(view: EditorView): Set<number> {
  const doc = view.state.doc;
  const active = new Set<number>();

  for (const range of view.state.selection.ranges) {
    active.add(doc.lineAt(range.anchor).number);
    active.add(doc.lineAt(range.head).number);
  }

  return active;
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  const activeLines = collectActiveLineNumbers(view);

  for (const { from, to } of view.visibleRanges) {
    const startLine = doc.lineAt(from).number;
    const endLine = doc.lineAt(to).number;

    for (let ln = startLine; ln <= endLine; ln++) {
      const line = doc.line(ln);
      const text = line.text;

      const parsed = parseSubtextLine(text);
      if (!parsed) continue;

      const isActive = activeLines.has(ln);
      const markerFrom = line.from + parsed.prefix.length;
      const markerTo = markerFrom + SUBTEXT_MARKER_LEN;

      builder.add(
        markerFrom,
        markerTo,
        isActive ? subtextMarkerActiveMark : subtextMarkerMark,
      );

      if (line.to > markerTo) {
        builder.add(markerTo, line.to, subtextLineMark);
      }
    }
  }

  return builder.finish();
}
