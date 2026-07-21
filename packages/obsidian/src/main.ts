import { Plugin, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { processSpoilers } from "./spoiler-post-processor";
import {
  spoilerLivePreviewExtension,
  findSpoilerRanges,
  getSpoilerState,
  setSpoilerStateEffect,
} from "./spoiler-detector";
import { processSubtextParagraph } from "./subtext-post-processor";
import { subtextEditorPlugin } from "./subtext-live-preview";

interface ObsidianEditor {
  cm?: EditorView;
}

interface MarkdownPreviewView {
  containerEl?: HTMLElement;
}

export default class DiscordSyntaxPlugin extends Plugin {
  onload() {
    // ── Reading View Post Processor ──────────────────────────────────────
    this.registerMarkdownPostProcessor((element) => {
      element.querySelectorAll("p").forEach((p) => {
        processSubtextParagraph(p);
      });
      processSpoilers(element);
    });

    // ── Live Preview Extensions ──────────────────────────────────────────
    this.registerEditorExtension(subtextEditorPlugin);
    this.registerEditorExtension(spoilerLivePreviewExtension);

    // ── Commands ─────────────────────────────────────────────────────────
    this.addCommand({
      id: "toggle-all-spoilers",
      name: "Toggle all spoilers in active note",
      callback: () => {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        const mode = activeView.getMode();
        if (mode === "preview") {
          const preview =
            activeView.previewMode as unknown as MarkdownPreviewView;
          const container = preview?.containerEl;
          if (!container) return;
          const spoilers = container.querySelectorAll(
            ".note-flow-spoiler, .discord-syntax-spoiler",
          );
          if (spoilers.length === 0) return;

          let anyHidden = false;
          for (let i = 0; i < spoilers.length; i++) {
            if (!spoilers[i].classList.contains("is-revealed")) {
              anyHidden = true;
              break;
            }
          }

          const targetReveal = anyHidden;
          for (let i = 0; i < spoilers.length; i++) {
            const el = spoilers[i] as HTMLElement;
            const inner = el.firstElementChild as HTMLElement | null;
            if (targetReveal) {
              el.classList.add("is-revealed");
              el.setAttribute("aria-expanded", "true");
              el.removeAttribute("aria-label");
              if (inner) inner.setAttribute("aria-hidden", "false");
            } else {
              el.classList.remove("is-revealed");
              el.setAttribute("aria-expanded", "false");
              el.setAttribute("aria-label", "Spoiler, click to reveal");
              if (inner) inner.setAttribute("aria-hidden", "true");
            }
          }
        } else if (mode === "source") {
          const editor = activeView.editor as unknown as ObsidianEditor;
          const cm = editor.cm;
          if (
            !cm ||
            !(cm instanceof EditorView) ||
            typeof cm.dispatch !== "function"
          )
            return;

          const state = cm.state;
          const text = state.doc.toString();
          const spoilers = findSpoilerRanges(text);
          if (spoilers.length === 0) return;

          let anyHidden = false;
          for (const s of spoilers) {
            const sState = getSpoilerState(state, s.from, s.to);
            if (sState === "hidden") {
              anyHidden = true;
              break;
            }
          }

          const targetState = anyHidden ? "revealed" : "hidden";
          const effects = spoilers.map((s) =>
            setSpoilerStateEffect.of({
              from: s.from,
              to: s.to,
              state: targetState,
            }),
          );

          let newSelection: { anchor: number } | undefined;
          if (state.selection.main.empty) {
            const pos = state.selection.main.head;
            for (const s of spoilers) {
              if (pos >= s.from && pos <= s.to) {
                newSelection = { anchor: s.to };
                break;
              }
            }
          }

          cm.dispatch({
            effects,
            selection: newSelection
              ? { anchor: newSelection.anchor }
              : undefined,
          });
        }
      },
    });
  }

  onunload() {}
}
