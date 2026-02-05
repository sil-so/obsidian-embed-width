import { Plugin } from "obsidian";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";

export default class EmbedWidthAdjuster extends Plugin {
  async onload() {
    this.registerEditorExtension(embedWidthViewPlugin);
  }
}

const embedWidthViewPlugin = ViewPlugin.fromClass(
  class {
    private observer: MutationObserver | null = null;
    private view: EditorView;
    private pendingUpdate: number | null = null;

    constructor(view: EditorView) {
      this.view = view;
      this.setupObserver(view);
      this.updateEmbeds(view);
    }

    setupObserver(view: EditorView) {
      // Watch for changes in the content DOM to detect async embed rendering
      this.observer = new MutationObserver(() => {
        // Debounce to avoid excessive updates
        if (this.pendingUpdate) {
          cancelAnimationFrame(this.pendingUpdate);
        }
        this.pendingUpdate = requestAnimationFrame(() => {
          this.pendingUpdate = null;
          this.updateEmbeds(this.view);
        });
      });

      this.observer.observe(view.contentDOM, {
        childList: true,
        subtree: true
      });
    }

    update(update: ViewUpdate) {
      this.view = update.view;
      // Trigger on more events to ensure we catch async rendering
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.geometryChanged ||
        update.focusChanged
      ) {
        this.updateEmbeds(update.view);
      }
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.pendingUpdate) {
        cancelAnimationFrame(this.pendingUpdate);
        this.pendingUpdate = null;
      }
    }

    updateEmbeds(view: EditorView) {
      const embeds = view.contentDOM.querySelectorAll(".internal-embed");
      let hasWide = false;

      embeds.forEach((embed) => {
        const pos = view.posAtDOM(embed);
        if (pos === null) return;

        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;

        const aliases = ["wide", "max", "full"];

        // Reset attribute
        embed.removeAttribute("data-width");

        for (const alias of aliases) {
          const regex = new RegExp(`\\|\\s*${alias}\\s*\\]\\]`);
          if (regex.test(lineText)) {
            embed.setAttribute("data-width", alias);
            hasWide = true;
            break;
          }
        }
      });

      // Toggle class on the editor container (view.dom)
      // This allows CSS to relax the parent container width restrictions
      if (hasWide) {
        view.dom.classList.add("has-custom-width");
      } else {
        view.dom.classList.remove("has-custom-width");
      }
    }
  }
);
