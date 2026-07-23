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
import * as obsidian from "obsidian";
import {
  findSpoilerRanges,
  SpoilerRange,
} from "@edems-dev/md-discord-syntax-core";

function getEditorLivePreviewField(): StateField<boolean> | null {
  const obs = obsidian as unknown as Record<string, unknown>;
  return (
    (obs["editorLivePreviewField"] as StateField<boolean> | undefined) ?? null
  );
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
    const spoilerEffects = tr.effects.filter((effect) =>
      effect.is(setSpoilerStateEffect),
    );
    if (!tr.docChanged && spoilerEffects.length === 0) {
      return value;
    }

    let mapped = value;
    if (tr.docChanged) {
      mapped = value
        .map((entry) => {
          const from = tr.changes.mapPos(entry.from, 1);
          const to = tr.changes.mapPos(entry.to, -1);
          return { ...entry, from, to };
        })
        .filter((entry) => {
          if (
            entry.from < 0 ||
            entry.from >= entry.to ||
            entry.to > tr.newDoc.length
          ) {
            return false;
          }
          return (
            tr.newDoc.sliceString(entry.from, entry.from + 2) === "||" &&
            tr.newDoc.sliceString(entry.to - 2, entry.to) === "||"
          );
        });
    }

    for (const effect of spoilerEffects) {
      const { from, to, state } = effect.value;
      mapped = mapped.filter(
        (entry) => !(entry.from === from && entry.to === to),
      );
      if (state !== "hidden") {
        mapped.push({ from, to, state });
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
  return getSpoilerAtPosition(state, selection.main.head);
}

export function getSpoilerAtPosition(
  state: EditorState,
  pos: number,
): SpoilerRange | null {
  const spoilers = findSpoilerRanges(state.doc.toString());
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

interface SyntaxSnapshot {
  boundaries: number[];
  excludedRanges: Array<{ from: number; to: number }>;
}

function isExcludedSyntaxNode(name: string): boolean {
  const lowerName = name.toLowerCase();
  return (
    lowerName.includes("code") ||
    lowerName.includes("comment") ||
    lowerName.includes("math")
  );
}

function collectSyntaxSnapshot(
  state: EditorState,
  from: number,
  to: number,
): SyntaxSnapshot {
  const boundarySet = new Set<number>();
  const excludedRanges: Array<{ from: number; to: number }> = [];

  try {
    syntaxTree(state).iterate({
      from,
      to,
      enter(node: { name: string; from: number; to: number }) {
        if (node.from > from && node.from < to) boundarySet.add(node.from);
        if (node.to > from && node.to < to) boundarySet.add(node.to);
        if (isExcludedSyntaxNode(node.name)) {
          excludedRanges.push({ from: node.from, to: node.to });
          return false;
        }
      },
    });
  } catch {
    // Syntax information is optional while CodeMirror reparses a change.
  }

  excludedRanges.sort((a, b) => a.from - b.from || a.to - b.to);
  const mergedExcluded: Array<{ from: number; to: number }> = [];
  for (const range of excludedRanges) {
    const previous = mergedExcluded[mergedExcluded.length - 1];
    if (previous && range.from <= previous.to) {
      previous.to = Math.max(previous.to, range.to);
    } else {
      mergedExcluded.push({ ...range });
    }
  }

  return {
    boundaries: Array.from(boundarySet).sort((a, b) => a - b),
    excludedRanges: mergedExcluded,
  };
}

function rangeOverlapsExcluded(
  from: number,
  to: number,
  excludedRanges: Array<{ from: number; to: number }>,
): boolean {
  let low = 0;
  let high = excludedRanges.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (excludedRanges[mid].to <= from) low = mid + 1;
    else high = mid;
  }
  const range = excludedRanges[low];
  return Boolean(range && range.from < to);
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
  const snapshot = collectSyntaxSnapshot(state, contentFrom, contentTo);
  return getSpoilerFragmentsFromSnapshot(
    state,
    contentFrom,
    contentTo,
    spoilerIndex,
    snapshot,
  );
}

function getSpoilerFragmentsFromSnapshot(
  state: EditorState,
  contentFrom: number,
  contentTo: number,
  spoilerIndex: number,
  snapshot: SyntaxSnapshot,
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

  for (const boundary of snapshot.boundaries) {
    if (boundary > contentFrom && boundary < contentTo) {
      pointsSet.add(boundary);
    }
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

export function buildSpoilerDecorations(
  view: EditorView,
  allSpoilers: SpoilerRange[] = findSpoilerRanges(view.state.doc.toString()),
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const state = view.state;
  const visibleSpoilers = allSpoilers.filter((spoiler) =>
    view.visibleRanges.some(
      ({ from, to }) => spoiler.to > from && spoiler.from < to,
    ),
  );
  const syntaxSnapshot =
    visibleSpoilers.length > 0
      ? collectSyntaxSnapshot(
          state,
          visibleSpoilers[0].from,
          visibleSpoilers[visibleSpoilers.length - 1].to,
        )
      : { boundaries: [], excludedRanges: [] };

  let spoilerIndex = 0;
  for (const spoiler of visibleSpoilers) {
    spoilerIndex++;
    const spoilerState = getSpoilerState(state, spoiler.from, spoiler.to);
    if (spoilerState === "editing") {
      continue;
    }

    if (isSelectionInSpoiler(state, spoiler.from, spoiler.to)) {
      continue;
    }

    if (
      rangeOverlapsExcluded(
        spoiler.from,
        spoiler.to,
        syntaxSnapshot.excludedRanges,
      )
    ) {
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

    const fragments = getSpoilerFragmentsFromSnapshot(
      state,
      spoiler.contentFrom,
      spoiler.contentTo,
      spoilerIndex,
      syntaxSnapshot,
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

  return builder.finish();
}

export const spoilerLivePreviewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    spoilers: SpoilerRange[];

    constructor(view: EditorView) {
      this.spoilers = findSpoilerRanges(view.state.doc.toString());
      this.decorations = buildSpoilerDecorations(view, this.spoilers);
    }

    update(update: ViewUpdate) {
      const oldState = update.startState.field(spoilerStateField, false);
      const newState = update.state.field(spoilerStateField, false);
      const stateChanged = oldState !== newState;

      if (update.docChanged) {
        this.spoilers = findSpoilerRanges(update.state.doc.toString());
      }

      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        stateChanged
      ) {
        this.decorations = buildSpoilerDecorations(update.view, this.spoilers);
      }
    }
  },
  {
    decorations: (v: { decorations: DecorationSet }) => v.decorations,
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
          const spoiler = getSpoilerAtPosition(view.state, pos);

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
              const spoiler = findSpoilerRanges(view.state.doc.toString()).find(
                (s) => s.from === from,
              );
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
