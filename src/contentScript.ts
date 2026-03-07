import type { ContentScriptRequest, ContentScriptResponse } from "./lib/messages";

chrome.runtime.onMessage.addListener(
  (message: ContentScriptRequest, sender, sendResponse: (response: ContentScriptResponse) => void) => {
    if (sender.id !== chrome.runtime.id) {
      return;
    }

    if (message.type !== "wedge/capture") {
      return;
    }

    const canonicalEl = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
    const descriptionEl = document.querySelector<HTMLMetaElement>("meta[name='description']");
    const ogTitleEl = document.querySelector<HTMLMetaElement>("meta[property='og:title']");

    sendResponse({
      selectedText: String(window.getSelection?.() || "").trim(),
      meta: {
        canonical: canonicalEl?.href || "",
        description: descriptionEl?.content || "",
        ogTitle: ogTitleEl?.content || ""
      }
    });

    return true;
  }
);
