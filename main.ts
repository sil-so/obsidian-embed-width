import { Plugin, MarkdownView, MarkdownPostProcessorContext } from "obsidian";
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from "@codemirror/view";
import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";

const WIDTH_ALIASES = ["wide", "max", "full"];
const EMBED_REGEX = /!\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g;

export default class EmbedWidthAdjuster extends Plugin {
  async onload() {
    // Register CodeMirror extension for Live Preview
    this.registerEditorExtension([embedWidthStateField, embedWidthViewPlugin]);

    // Register post processor for Reading View
    this.registerMarkdownPostProcessor(this.postProcessor.bind(this));

    // Trigger updates when workspace changes
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.refreshActiveLeaf();
      })
    );

    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.refreshActiveLeaf();
      })
    );
  }

  refreshActiveLeaf() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    // For reading view, re-process after a delay
    setTimeout(() => {
      const contentEl = view.contentEl;
      this.processEmbedsInContainer(contentEl, view);
    }, 100);

    setTimeout(() => {
      const contentEl = view.contentEl;
      this.processEmbedsInContainer(contentEl, view);
    }, 500);
  }

  postProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    // Find embeds in the rendered content
    const embeds = el.querySelectorAll(".internal-embed");
    if (embeds.length === 0) return;

    // Get the source section info to find the original markdown
    const sectionInfo = ctx.getSectionInfo(el);
    if (!sectionInfo) return;

    const { lineStart, lineEnd } = sectionInfo;
    const lines = sectionInfo.text.split("\n").slice(lineStart, lineEnd + 1);
    const sectionText = lines.join("\n");

    // Check if any embeds in this section have width aliases
    embeds.forEach((embed) => {
      const src = embed.getAttribute("src") || "";
      
      // Find this embed in the source text and check for aliases
      for (const alias of WIDTH_ALIASES) {
        const patterns = [
          new RegExp(`!\\[\\[${this.escapeRegex(src)}\\|[^\\]]*${alias}[^\\]]*\\]\\]`, "i"),
          new RegExp(`!\\[\\[${this.escapeRegex(src)}#[^|]*\\|[^\\]]*${alias}[^\\]]*\\]\\]`, "i"),
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(sectionText)) {
            embed.setAttribute("data-width", alias);
            // Also mark parent containers
            const container = el.closest(".markdown-reading-view, .markdown-preview-view");
            if (container) {
              container.classList.add("has-custom-width");
            }
            return;
          }
        }
      }
    });
  }

  processEmbedsInContainer(container: HTMLElement, view: MarkdownView) {
    const embeds = container.querySelectorAll(".internal-embed:not([data-width])");
    if (embeds.length === 0) return;

    // Get file content
    const file = view.file;
    if (!file) return;

    const content = view.data || "";

    embeds.forEach((embed) => {
      const src = embed.getAttribute("src") || "";
      if (!src) return;

      // Find this embed in the source and check for width alias
      for (const alias of WIDTH_ALIASES) {
        const patterns = [
          new RegExp(`!\\[\\[${this.escapeRegex(src)}\\|[^\\]]*${alias}[^\\]]*\\]\\]`, "i"),
          new RegExp(`!\\[\\[${this.escapeRegex(src)}#[^|]*\\|[^\\]]*${alias}[^\\]]*\\]\\]`, "i"),
          new RegExp(`!\\[\\[[^\\]]*${this.escapeRegex(src)}[^\\]]*\\|[^\\]]*${alias}[^\\]]*\\]\\]`, "i"),
        ];

        for (const pattern of patterns) {
          if (pattern.test(content)) {
            embed.setAttribute("data-width", alias);
            const readingView = container.querySelector(".markdown-reading-view, .markdown-preview-view");
            if (readingView) {
              readingView.classList.add("has-custom-width");
            }
            break;
          }
        }
      }
    });
  }

  escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

// State field to track if document has wide embeds
const embedWidthStateField = StateField.define<boolean>({
  create(state) {
    return checkDocForWideEmbeds(state.doc.toString());
  },
  update(value, tr) {
    if (tr.docChanged) {
      return checkDocForWideEmbeds(tr.newDoc.toString());
    }
    return value;
  },
});

function checkDocForWideEmbeds(text: string): boolean {
  for (const alias of WIDTH_ALIASES) {
    const regex = new RegExp(`!\\[\\[[^\\]]+\\|[^\\]]*${alias}[^\\]]*\\]\\]`, "i");
    if (regex.test(text)) {
      return true;
    }
  }
  return false;
}

// View plugin to update DOM based on state and handle async embed rendering
const embedWidthViewPlugin = ViewPlugin.fromClass(
  class {
    private observer: MutationObserver | null = null;
    private view: EditorView;
    private retryTimeouts: number[] = [];

    constructor(view: EditorView) {
      this.view = view;
      this.setupObserver(view);
      this.updateEmbeds();
      this.scheduleRetries();
    }

    scheduleRetries() {
      // Clear any existing retries
      this.retryTimeouts.forEach(t => clearTimeout(t));
      this.retryTimeouts = [];
      
      // Schedule multiple retries to catch async embed rendering
      const delays = [50, 150, 300, 500, 1000, 2000];
      delays.forEach(delay => {
        this.retryTimeouts.push(
          window.setTimeout(() => this.updateEmbeds(), delay)
        );
      });
    }

    setupObserver(view: EditorView) {
      this.observer = new MutationObserver(() => {
        this.updateEmbeds();
      });

      this.observer.observe(view.contentDOM, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "src", "data-src"]
      });
    }

    update(update: ViewUpdate) {
      this.view = update.view;
      if (update.docChanged || update.viewportChanged) {
        this.updateEmbeds();
        this.scheduleRetries();
      }
    }

    updateEmbeds() {
      const view = this.view;
      const docText = view.state.doc.toString();
      const hasWideEmbeds = view.state.field(embedWidthStateField);

      // Toggle class on editor container
      if (hasWideEmbeds) {
        view.dom.classList.add("has-custom-width");
      } else {
        view.dom.classList.remove("has-custom-width");
      }

      // Process each embed element
      const embeds = view.contentDOM.querySelectorAll(".internal-embed");
      
      embeds.forEach((embed) => {
        // Try to get position from DOM
        let lineText = "";
        
        const pos = view.posAtDOM(embed);
        if (pos !== null) {
          try {
            const line = view.state.doc.lineAt(pos);
            lineText = line.text;
          } catch (e) {
            // Position might be invalid
          }
        }

        // If we couldn't get line text from position, try matching by src
        if (!lineText) {
          const src = embed.getAttribute("src") || embed.getAttribute("data-src") || "";
          if (src) {
            // Find line containing this embed
            const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const srcPattern = new RegExp(`!\\[\\[[^\\]]*${escapedSrc}[^\\]]*\\]\\]`);
            const match = docText.match(srcPattern);
            if (match) {
              lineText = match[0];
            }
          }
        }

        // Reset and check for width aliases
        embed.removeAttribute("data-width");

        for (const alias of WIDTH_ALIASES) {
          const regex = new RegExp(`\\|[^\\]]*${alias}[^\\]]*\\]\\]`, "i");
          if (regex.test(lineText)) {
            embed.setAttribute("data-width", alias);
            break;
          }
        }
      });
    }

    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.retryTimeouts.forEach(t => clearTimeout(t));
      this.retryTimeouts = [];
    }
  }
);
