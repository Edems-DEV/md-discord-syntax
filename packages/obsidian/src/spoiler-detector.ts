import {
  ViewPlugin,
  ViewUpdate,
  EditorView,
  Decoration,
  DecorationSet,
} from "@codemirror/view";
import {
  RangeSetBuilder,
  EditorState,
  StateField,
  StateEffect,
} from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { editorLivePreviewField } from "obsidian";
import {
  findSpoilerRanges,
  SpoilerRange,
} from "@edems-dev/md-discord-syntax-core";

function getEditorLivePreviewField(): StateField<boolean> | null {
  return typeof editorLivePreviewField !== "undefined"
    ? editorLivePreviewField
    : null;
}

export { findSpoilerRanges, SpoilerRange };

export type SpoilerState = "hidden" | "revealed" | "editing";

export interface SpoilerStateEntry {
  from: number;
  to: number;
  state: SpoilerState;
}

export const setSpoilerStateEffect = StateEffect.define<{
  from: number;
  to: number;
  state: SpoilerState;
}>();

export const spoilerStateField = StateField.define<SpoilerStateEntry[]>({
  create() {
    return [];
  },
  update(value, tr) {
    let mapped = value.map((entry) => {
      const from = tr.changes.mapPos(entry.from, 1);
      const to = tr.changes.mapPos(entry.to, -1);
      return { ...entry, from, to };
    });

    for (const effect of tr.effects) {
      if (effect.is(setSpoilerStateEffect)) {
        const { from, to, state } = effect.value;
        mapped = mapped.filter(
          (entry) => !(entry.from === from && entry.to === to),
        );
        if (state !== "hidden") {
          mapped.push({ from, to, state });
        }
      }
    }

    return mapped;
  },
});

export function isSelectionInSpoiler(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  for (const range of state.selection.ranges) {
    if (range.empty) {
      if (range.head >= from && range.head < to) {
        return true;
      }
    } else {
      if (range.from < to && range.to > from) {
        return true;
      }
    }
  }
  return false;
}

export function getSpoilerState(
  state: EditorState,
  from: number,
  to: number,
): SpoilerState {
  const livePreviewField = getEditorLivePreviewField();
  if (livePreviewField) {
    const isLivePreview = state.field(livePreviewField, false);
    if (isLivePreview === false) {
      return "revealed";
    }
  }

  const entries = state.field(spoilerStateField, false) || [];
  const match = entries.find((e) => e.from === from && e.to === to);
  if (match) return match.state;

  const overlap = entries.find(
    (e) => Math.max(e.from, from) < Math.min(e.to, to),
  );
  if (overlap) return overlap.state;

  return "hidden";
}

export function getSpoilerAtSelection(state: EditorState): SpoilerRange | null {
  const selection = state.selection;
  if (!selection.main.empty) return null;
  const pos = selection.main.head;

  const line = state.doc.lineAt(pos);
  const spoilers = findSpoilerRanges(line.text, line.from);
  for (const s of spoilers) {
    if (pos >= s.from && pos <= s.to) {
      return s;
    }
  }
  return null;
}

export interface SpoilerFragment {
  from: number;
  to: number;
  isStart: boolean;
  isEnd: boolean;
  classes: string;
  spoilerId?: string;
}

export function isRangeInCodeNode(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  try {
    const tree = syntaxTree(state);
    if (!tree) return false;

    let inCode = false;
    tree.iterate({
      from,
      to,
      enter(node: { name: string; from: number; to: number }) {
        const name = node.name.toLowerCase();
        if (
          name.includes("code") ||
          name.includes("comment") ||
          name.includes("math")
        ) {
          inCode = true;
          return false;
        }
      },
    });
    return inCode;
  } catch {
    return false;
  }
}

export function getSpoilerFragments(
  state: EditorState,
  contentFrom: number,
  contentTo: number,
  spoilerIndex = 0,
): SpoilerFragment[] {
  if (contentFrom >= contentTo) return [];

  const pointsSet = new Set<number>();
  pointsSet.add(contentFrom);
  pointsSet.add(contentTo);

  const text = state.doc.sliceString(contentFrom, contentTo);
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      const breakPos = contentFrom + i;
      pointsSet.add(breakPos);
      if (breakPos + 1 <= contentTo) {
        pointsSet.add(breakPos + 1);
      }
    }
  }

  try {
    const tree = syntaxTree(state);
    if (tree) {
      tree.iterate({
        from: contentFrom,
        to: contentTo,
        enter(node: { name: string; from: number; to: number }) {
          if (node.from > contentFrom && node.from < contentTo) {
            pointsSet.add(node.from);
          }
          if (node.to > contentFrom && node.to < contentTo) {
            pointsSet.add(node.to);
          }
        },
      });
    }
  } catch {
    // Ignore tree syntax errors if unavailable
  }

  const sortedPoints = Array.from(pointsSet).sort((a, b) => a - b);
  const rawFragments: { from: number; to: number }[] = [];

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const fFrom = sortedPoints[i];
    const fTo = sortedPoints[i + 1];
    if (fFrom < fTo) {
      const sliceStr = state.doc.sliceString(fFrom, fTo);
      if (sliceStr !== "\n") {
        rawFragments.push({ from: fFrom, to: fTo });
      }
    }
  }

  if (rawFragments.length === 0) {
    return [];
  }

  return rawFragments.map((frag, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === rawFragments.length - 1;

    const classNames = ["note-flow-spoiler", "discord-syntax-spoiler"];
    if (isStart && isEnd) {
      classNames.push(
        "note-flow-spoiler-single",
        "note-flow-spoiler-start",
        "note-flow-spoiler-end",
        "note-flow-spoiler-cap-left",
        "note-flow-spoiler-cap-right",
        "discord-syntax-spoiler-single",
        "discord-syntax-spoiler-start",
        "discord-syntax-spoiler-end",
        "discord-syntax-spoiler-cap-left",
        "discord-syntax-spoiler-cap-right",
      );
    } else if (isStart) {
      classNames.push(
        "note-flow-spoiler-start",
        "note-flow-spoiler-cap-left",
        "discord-syntax-spoiler-start",
        "discord-syntax-spoiler-cap-left",
      );
    } else if (isEnd) {
      classNames.push(
        "note-flow-spoiler-end",
        "note-flow-spoiler-cap-right",
        "discord-syntax-spoiler-end",
        "discord-syntax-spoiler-cap-right",
      );
    }

    classNames.push(`note-flow-spoiler-group-${spoilerIndex}`);

    return {
      from: frag.from,
      to: frag.to,
      isStart,
      isEnd,
      classes: classNames.join(" "),
    };
  });
}

export function buildSpoilerDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const state = view.state;

  let spoilerIndex = 0;
  for (const { from, to } of view.visibleRanges) {
    const text = state.doc.sliceString(from, to);
    const spoilers = findSpoilerRanges(text, from);

    for (const spoiler of spoilers) {
      spoilerIndex++;
      const spoilerState = getSpoilerState(state, spoiler.from, spoiler.to);
      if (spoilerState === "editing") {
        continue;
      }

      if (isSelectionInSpoiler(state, spoiler.from, spoiler.to)) {
        continue;
      }

      if (isRangeInCodeNode(state, spoiler.from, spoiler.to)) {
        continue;
      }

      const isRevealed = spoilerState === "revealed";

      builder.add(
        spoiler.from,
        spoiler.contentFrom,
        Decoration.mark({
          class:
            "note-flow-spoiler-delimiter note-flow-spoiler-hidden discord-syntax-spoiler-delimiter",
        }),
      );

      const fragments = getSpoilerFragments(
        state,
        spoiler.contentFrom,
        spoiler.contentTo,
        spoilerIndex,
      );

      if (fragments.length > 0) {
        for (const frag of fragments) {
          let classes = frag.classes;
          if (isRevealed) {
            classes += " is-revealed";
          }
          builder.add(
            frag.from,
            frag.to,
            Decoration.mark({
              class: classes,
              attributes: {
                "data-spoiler-id": `spoiler-${spoiler.from}`,
              },
            }),
          );
        }
      } else if (spoiler.contentFrom < spoiler.contentTo) {
        let classes =
          "note-flow-spoiler discord-syntax-spoiler note-flow-spoiler-single note-flow-spoiler-start note-flow-spoiler-end note-flow-spoiler-cap-left note-flow-spoiler-cap-right";
        if (isRevealed) {
          classes += " is-revealed";
        }
        builder.add(
          spoiler.contentFrom,
          spoiler.contentTo,
          Decoration.mark({
            class: classes,
            attributes: {
              "data-spoiler-id": `spoiler-${spoiler.from}`,
            },
          }),
        );
      }

      builder.add(
        spoiler.contentTo,
        spoiler.to,
        Decoration.mark({
          class:
            "note-flow-spoiler-delimiter note-flow-spoiler-hidden discord-syntax-spoiler-delimiter",
        }),
      );
    }
  }

  return builder.finish();
}

export const spoilerLivePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildSpoilerDecorations(view);
    }

    update(update: ViewUpdate) {
      const oldState = update.startState.field(spoilerStateField, false);
      const newState = update.state.field(spoilerStateField, false);
      const stateChanged = oldState !== newState;

      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        stateChanged
      ) {
        this.decorations = buildSpoilerDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      mousedown(event, view) {
        const livePreviewField = getEditorLivePreviewField();
        if (
          livePreviewField &&
          view.state.field(livePreviewField, false) === false
        )
          return;
        const target = event.target as HTMLElement | null;

        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
          const line = view.state.doc.lineAt(pos);
          const spoilers = findSpoilerRanges(line.text, line.from);
          const spoiler = spoilers.find((s) => pos >= s.from && pos <= s.to);

          if (spoiler) {
            const currentState = getSpoilerState(
              view.state,
              spoiler.from,
              spoiler.to,
            );
            if (currentState === "hidden") {
              event.preventDefault();
              view.dispatch({
                effects: setSpoilerStateEffect.of({
                  from: spoiler.from,
                  to: spoiler.to,
                  state: "revealed",
                }),
              });
              return true;
            } else if (currentState === "revealed") {
              event.preventDefault();
              view.dispatch({
                effects: setSpoilerStateEffect.of({
                  from: spoiler.from,
                  to: spoiler.to,
                  state: "editing",
                }),
                selection: { anchor: pos },
                scrollIntoView: true,
              });
              view.focus();
              return true;
            } else if (currentState === "editing") {
              event.preventDefault();
              view.dispatch({
                effects: setSpoilerStateEffect.of({
                  from: spoiler.from,
                  to: spoiler.to,
                  state: "hidden",
                }),
                selection: { anchor: spoiler.to },
                scrollIntoView: true,
              });
              view.focus();
              return true;
            }
          }
        }

        const spoilerEl = target?.closest?.(
          "[data-spoiler-id]",
        ) as HTMLElement | null;
        if (spoilerEl) {
          const spoilerId = spoilerEl.getAttribute("data-spoiler-id");
          if (spoilerId) {
            const fromStr = spoilerId.replace("spoiler-", "");
            const from = parseInt(fromStr, 10);
            if (!isNaN(from) && from >= 0 && from <= view.state.doc.length) {
              const line = view.state.doc.lineAt(from);
              const spoilers = findSpoilerRanges(line.text, line.from);
              const spoiler = spoilers.find((s) => s.from === from);
              if (spoiler) {
                const currentState = getSpoilerState(
                  view.state,
                  spoiler.from,
                  spoiler.to,
                );
                if (currentState === "hidden") {
                  event.preventDefault();
                  view.dispatch({
                    effects: setSpoilerStateEffect.of({
                      from: spoiler.from,
                      to: spoiler.to,
                      state: "revealed",
                    }),
                  });
                  return true;
                } else if (currentState === "revealed") {
                  event.preventDefault();
                  view.dispatch({
                    effects: setSpoilerStateEffect.of({
                      from: spoiler.from,
                      to: spoiler.to,
                      state: "editing",
                    }),
                    selection: { anchor: spoiler.contentFrom },
                    scrollIntoView: true,
                  });
                  view.focus();
                  return true;
                } else if (currentState === "editing") {
                  event.preventDefault();
                  view.dispatch({
                    effects: setSpoilerStateEffect.of({
                      from: spoiler.from,
                      to: spoiler.to,
                      state: "hidden",
                    }),
                    selection: { anchor: spoiler.to },
                    scrollIntoView: true,
                  });
                  view.focus();
                  return true;
                }
              }
            }
          }
        }
      },
      keydown(event, view) {
        const livePreviewField = getEditorLivePreviewField();
        if (
          livePreviewField &&
          view.state.field(livePreviewField, false) === false
        )
          return;
        if (event.key === "Enter" || event.key === " ") {
          const spoiler = getSpoilerAtSelection(view.state);
          if (spoiler) {
            const currentState = getSpoilerState(
              view.state,
              spoiler.from,
              spoiler.to,
            );
            if (currentState === "hidden") {
              event.preventDefault();
              view.dispatch({
                effects: setSpoilerStateEffect.of({
                  from: spoiler.from,
                  to: spoiler.to,
                  state: "revealed",
                }),
              });
              return true;
            } else if (currentState === "revealed") {
              event.preventDefault();
              view.dispatch({
                effects: setSpoilerStateEffect.of({
                  from: spoiler.from,
                  to: spoiler.to,
                  state: "editing",
                }),
                selection: { anchor: spoiler.contentFrom },
                scrollIntoView: true,
              });
              view.focus();
              return true;
            } else if (currentState === "editing") {
              event.preventDefault();
              view.dispatch({
                effects: setSpoilerStateEffect.of({
                  from: spoiler.from,
                  to: spoiler.to,
                  state: "hidden",
                }),
                selection: { anchor: spoiler.to },
                scrollIntoView: true,
              });
              view.focus();
              return true;
            }
          }
        }
      },
      mouseover(event, view) {
        const target = event.target as HTMLElement | null;
        const spoilerEl = target?.closest?.(
          "[data-spoiler-id]",
        ) as HTMLElement | null;
        if (!spoilerEl) return;
        const spoilerId = spoilerEl.getAttribute("data-spoiler-id");
        if (!spoilerId || !/^[a-zA-Z0-9_-]+$/.test(spoilerId)) return;

        const relatedTarget = event.relatedTarget as HTMLElement | null;
        const relatedSpoiler = relatedTarget?.closest?.(
          "[data-spoiler-id]",
        ) as HTMLElement | null;
        const relatedId = relatedSpoiler?.getAttribute("data-spoiler-id");
        if (relatedId === spoilerId) return;

        const elements = view.dom.findAll(`[data-spoiler-id="${spoilerId}"]`);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (el instanceof HTMLElement) {
            el.classList.add("is-hovered");
          }
        }
      },
      mouseout(event, view) {
        const target = event.target as HTMLElement | null;
        const spoilerEl = target?.closest?.(
          "[data-spoiler-id]",
        ) as HTMLElement | null;
        if (!spoilerEl) return;
        const spoilerId = spoilerEl.getAttribute("data-spoiler-id");
        if (!spoilerId || !/^[a-zA-Z0-9_-]+$/.test(spoilerId)) return;

        const relatedTarget = event.relatedTarget as HTMLElement | null;
        const relatedSpoiler = relatedTarget?.closest?.(
          "[data-spoiler-id]",
        ) as HTMLElement | null;
        const relatedId = relatedSpoiler?.getAttribute("data-spoiler-id");
        if (relatedId === spoilerId) return;

        const elements = view.dom.findAll(`[data-spoiler-id="${spoilerId}"]`);
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (el instanceof HTMLElement) {
            el.classList.remove("is-hovered");
          }
        }
      },
    },
  },
);

export const spoilerLivePreviewExtension = [
  spoilerStateField,
  spoilerLivePreviewPlugin,
];
