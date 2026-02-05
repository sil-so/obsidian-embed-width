"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => EmbedWidthAdjuster
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_view = require("@codemirror/view");
var EmbedWidthAdjuster = class extends import_obsidian.Plugin {
  async onload() {
    this.registerEditorExtension(embedWidthViewPlugin);
  }
};
var embedWidthViewPlugin = import_view.ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.observer = null;
      this.pendingUpdate = null;
      this.view = view;
      this.setupObserver(view);
      this.updateEmbeds(view);
    }
    setupObserver(view) {
      this.observer = new MutationObserver(() => {
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
    update(update) {
      this.view = update.view;
      if (update.docChanged || update.viewportChanged || update.geometryChanged || update.focusChanged) {
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
    updateEmbeds(view) {
      const embeds = view.contentDOM.querySelectorAll(".internal-embed");
      let hasWide = false;
      embeds.forEach((embed) => {
        const pos = view.posAtDOM(embed);
        if (pos === null) return;
        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;
        const aliases = ["wide", "max", "full"];
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
      if (hasWide) {
        view.dom.classList.add("has-custom-width");
      } else {
        view.dom.classList.remove("has-custom-width");
      }
    }
  }
);
