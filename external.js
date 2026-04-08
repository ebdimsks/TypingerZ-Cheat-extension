(() => {
  "use strict";

  const TARGET_ID = "mondaifield";
  const DEBOUNCE_MS = 2;

  const state = {
    observer: null,
    bootObserver: null,
    timerId: null,
    started: false,
    lastEmittedText: "",
  };

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
    if (character === " ") return { key: " ", code: "Space" };
    if (character === "\n") return { key: "Enter", code: "Enter" };
    if (/^[a-z]$/i.test(character)) {
      return { key: character, code: `Key${character.toUpperCase()}` };
    }
    if (/^[0-9]$/.test(character)) {
      return { key: character, code: `Digit${character}` };
    }
    return { key: character, code: "" };
  }

  function normalizeText(text) {
    return String(text ?? "").replace(/\r\n/g, "\n");
  }

  function typeText(text) {
    const normalized = normalizeText(text);

    if (!normalized.trim()) return;
    if (normalized === state.lastEmittedText) return;

    state.lastEmittedText = normalized;

    for (const char of normalized) {
      const { key, code } = getKeyInfo(char);
      dispatchKey("keydown", key, code);
      dispatchKey("keyup", key, code);
    }
  }

  function scheduleTyping(text) {
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
    }

    state.timerId = setTimeout(() => {
      state.timerId = null;
      typeText(text);
    }, DEBOUNCE_MS);
  }

  function getTargetElement() {
    return document.getElementById(TARGET_ID);
  }

  function handleTargetChange() {
    const el = getTargetElement();
    if (!el) return;

    const text = el.textContent || "";
    if (!text.trim()) return;

    scheduleTyping(text);
  }

  function disconnectObservers() {
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }

    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    if (state.bootObserver) {
      state.bootObserver.disconnect();
      state.bootObserver = null;
    }
  }

  function attachTargetObserver(el) {
    if (state.observer) return;

    state.observer = new MutationObserver(() => {
      handleTargetChange();
    });

    state.observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function startObserver() {
    if (state.started) return;
    state.started = true;

    const target = getTargetElement();
    if (target) {
      attachTargetObserver(target);
      handleTargetChange();
      return;
    }

    state.bootObserver = new MutationObserver(() => {
      const el = getTargetElement();
      if (!el) return;

      attachTargetObserver(el);
      if (state.bootObserver) {
        state.bootObserver.disconnect();
        state.bootObserver = null;
      }

      handleTargetChange();
    });

    state.bootObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleTargetChange();
    }
  });

  window.addEventListener("beforeunload", disconnectObservers, { once: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
})();
