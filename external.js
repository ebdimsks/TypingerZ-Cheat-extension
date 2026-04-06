(() => {
  "use strict";

  const TARGET_ID = "mondaifield";
  const DELAY_MS = 10;

  let lastTypedText = "";
  let observerStarted = false;
  let timer = null;

  function dispatchKey(type, key, code) {
    const event = new KeyboardEvent(type, {
      key,
      code,
      location: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(event);
  }

  function getKeyInfo(character) {
    if (character === " ") {
      return { key: " ", code: "Space" };
    }
    if (character === "\n") {
      return { key: "Enter", code: "Enter" };
    }
    if (/^[a-z]$/i.test(character)) {
      return { key: character, code: `Key${character.toUpperCase()}` };
    }
    if (/^[0-9]$/.test(character)) {
      return { key: character, code: `Digit${character}` };
    }
    return { key: character, code: "" };
  }

  function typeText(text) {
    if (!text || text === lastTypedText) return;
    lastTypedText = text;

    for (const char of text) {
      const { key, code } = getKeyInfo(char);
      dispatchKey("keydown", key, code);
      dispatchKey("keyup", key, code);
    }
  }

  function scheduleTyping(text) {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      typeText(text);
    }, DELAY_MS);
  }

  function handleTarget() {
    const el = document.getElementById(TARGET_ID);
    if (!el) return;

    const text = el.textContent || "";
    if (!text.trim()) return;

    scheduleTyping(text);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;

    const observer = new MutationObserver(() => {
      handleTarget();
    });

    const attach = () => {
      const el = document.getElementById(TARGET_ID);
      if (!el) return false;

      observer.observe(el, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return true;
    };

    if (attach()) {
      handleTarget();
      return;
    }

    const bootObserver = new MutationObserver(() => {
      if (attach()) {
        bootObserver.disconnect();
        handleTarget();
      }
    });

    bootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
})();