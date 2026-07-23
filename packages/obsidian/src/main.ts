import { Plugin, MarkdownView, Notice, type WorkspaceLeaf } from "obsidian";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { processSpoilers } from "./spoiler-post-processor";
import {
  findSpoilerRanges,
  getSpoilerState,
  setSpoilerStateEffect,
} from "./spoiler-detector";
import { processSubtextParagraph } from "./subtext-post-processor";
import {
  DiscordSyntaxSettings,
  normalizeSettings,
  getEnabledEditorExtensions,
} from "./settings";
import { DiscordSyntaxSettingTab } from "./settings-tab";
import { applyStyleVariables, removeStyleVariables } from "./style-manager";


export default class DiscordSyntaxPlugin extends Plugin {
  settings!: DiscordSyntaxSettings;
  private editorExtensions: Extension[] = [];
  private saveQueue: Promise<void> = Promise.resolve();
  private styledBodies = new Set<HTMLElement>();

  async onload() {
    await this.loadSettings();

    this.applyStyles();

    this.registerEvent(
      this.app.workspace.on("layout-change", () => this.applyStyles()),
    );
    this.registerEvent(
      this.app.workspace.on("window-open", () => this.applyStyles()),
    );

    // ── Reading View Post Processor ──────────────────────────────────────
    this.registerMarkdownPostProcessor((element: HTMLElement) => {
      if (this.settings.enableSubtext) {
        const selector = "p, li, .callout-content";
        const targets = new Set<HTMLElement>();
        if (
          typeof element.matches === "function" &&
          element.matches(selector)
        ) {
          targets.add(element);
        }
        const children = element.findAll(selector);
        for (let i = 0; i < children.length; i++) {
          targets.add(children[i]);
        }
        for (const target of targets) {
          processSubtextParagraph(target);
        }
      }
      if (this.settings.enableSpoilers) {
        processSpoilers(element);
      }
    });

    // ── Live Preview Extensions (Mutable Array Pattern) ─────────────────
    this.editorExtensions.push(...getEnabledEditorExtensions(this.settings));
    this.registerEditorExtension(this.editorExtensions);

    // ── Settings Tab ─────────────────────────────────────────────────────
    this.addSettingTab(new DiscordSyntaxSettingTab(this.app, this));

    // ── Commands ─────────────────────────────────────────────────────────
    this.addCommand({
      id: "toggle-all-spoilers",
      name: "Toggle all spoilers in active note",
      callback: () => {
        if (!this.settings.enableSpoilers) {
          new Notice("Spoiler syntax is disabled in settings");
          return;
        }

        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        const mode = activeView.getMode();
        if (mode === "preview") {
          const container =
            activeView.contentEl.find(".markdown-preview-view") ??
            activeView.contentEl;
          if (!container) return;
          const spoilers = container.findAll(
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
            const el = spoilers[i];
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
          const cmEl = activeView.contentEl.find(".cm-editor");
          const cm = cmEl ? EditorView.findFromDOM(cmEl) : null;
          if (!cm || typeof cm.dispatch !== "function") return;

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

  async loadSettings() {
    const loadedData: unknown = await this.loadData();
    this.settings = normalizeSettings(loadedData);
  }

  async saveSettings(): Promise<void> {
    const queue = this.saveQueue
      .then(async () => {
        await this.saveData(this.settings);
      })
      .catch((err: unknown) => {
        console.error("Discord Syntax: Failed to save settings", err);
      });
    this.saveQueue = queue;
    return queue;
  }

  public getTargetBodies(): HTMLElement[] {
    const bodies = new Set<HTMLElement>();

    if (typeof document !== "undefined" && document.body) {
      bodies.add(document.body);
    }
    if (typeof activeDocument !== "undefined" && activeDocument.body) {
      bodies.add(activeDocument.body);
    }
    if (this.app.workspace.containerEl?.ownerDocument?.body) {
      bodies.add(this.app.workspace.containerEl.ownerDocument.body);
    }
    if (typeof this.app.workspace.iterateAllLeaves === "function") {
      this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
        const body = leaf.view?.containerEl?.ownerDocument?.body;
        if (body) {
          bodies.add(body);
        }
      });
    }

    return Array.from(bodies);
  }

  public applyStyles(extraTarget?: HTMLElement): void {
    const bodies = this.getTargetBodies();
    if (extraTarget) {
      bodies.push(extraTarget);
    }
    for (const body of bodies) {
      this.styledBodies.add(body);
      applyStyleVariables(this.settings, body);
    }
  }

  rebuildEditorExtensions() {
    this.editorExtensions.length = 0;
    this.editorExtensions.push(...getEnabledEditorExtensions(this.settings));
    this.app.workspace.updateOptions();
  }

  onunload() {
    const bodiesToClean = new Set<HTMLElement>([
      ...this.getTargetBodies(),
      ...this.styledBodies,
    ]);
    for (const body of bodiesToClean) {
      removeStyleVariables(body);
    }
    this.styledBodies.clear();
  }
}
