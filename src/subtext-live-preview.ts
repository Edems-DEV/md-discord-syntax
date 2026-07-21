import { ViewPlugin, Decoration, EditorView, ViewUpdate, DecorationSet } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

const MARKER = '-# '
const MARKER_LEN = MARKER.length

const subtextLineMark = Decoration.mark({ class: 'discord-subtext' })

const subtextMarkerMark = Decoration.mark({ class: 'discord-subtext-marker' })

const subtextMarkerActiveMark = Decoration.mark({
  class: 'discord-subtext-marker-active',
})

export const subtextEditorPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)

function collectActiveLineNumbers(view: EditorView): Set<number> {
  const doc = view.state.doc
  const active = new Set<number>()

  for (const range of view.state.selection.ranges) {
    active.add(doc.lineAt(range.anchor).number)
    active.add(doc.lineAt(range.head).number)
  }

  return active
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const doc = view.state.doc

  const activeLines = collectActiveLineNumbers(view)

  for (const { from, to } of view.visibleRanges) {
    const startLine = doc.lineAt(from).number
    const endLine = doc.lineAt(to).number

    for (let ln = startLine; ln <= endLine; ln++) {
      const line = doc.line(ln)
      const text = line.text

      if (!text.startsWith(MARKER)) continue

      const isActive = activeLines.has(ln)

      builder.add(
        line.from,
        line.from + MARKER_LEN,
        isActive ? subtextMarkerActiveMark : subtextMarkerMark
      )

      if (line.to > line.from + MARKER_LEN) {
        builder.add(line.from + MARKER_LEN, line.to, subtextLineMark)
      }
    }
  }

  return builder.finish()
}
