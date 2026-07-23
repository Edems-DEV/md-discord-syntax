import type { StateField } from "@codemirror/state";

declare global {
  const activeDocument: Document;

  interface Element {
    find<T extends HTMLElement = HTMLElement>(selector: string): T | null;
    findAll<T extends HTMLElement = HTMLElement>(selector: string): T[];
  }
}

declare module "obsidian" {
  interface Workspace {
    updateOptions(): void;
  }
  const editorLivePreviewField: StateField<boolean> | undefined;
}
