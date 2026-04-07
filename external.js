(() => {
  "use strict";

  const CONFIG = {
    targetId: "mondaifield",
    debounceMinMs: 2,
    debounceMaxMs: 50,
  };

  const state = {
    targetObserver: null,
    bootObserver: null,
    timerId: null,
    started: false,
    lastEmittedText: "",
  };

  const normalizeText = (text) => String(text ?? "").replace(/\r\n/g, "\n");

  const getRandomIntInclusive = (min, max) => {
    const lower = Math.ceil(min);
    const upper = Math.floor(max);
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  };

  const getDebounceMs = () =>
    getRandomIntInclusive(CONFIG.debounceMinMs, CONFIG.debounceMaxMs);

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

  function typeText(text) {
    const normalized = normalizeText(text);

    if (!normalized.trim()) return;
    if (normalized === state.lastEmittedText) return;

    state.lastEmittedText = normalized;

    for (const character of normalized) {
      const { key, code } = getKeyInfo(character);
      dispatchKey("keydown", key, code);
      dispatchKey("keyup", key, code);
    }
  }

  function clearTimer() {
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
  }

  function scheduleTyping(text) {
    clearTimer();

    const debounceMs = getDebounceMs();
    state.timerId = setTimeout(() => {
      state.timerId = null;
      typeText(text);
    }, debounceMs);
  }

  function getTargetElement() {
    return document.getElementById(CONFIG.targetId);
  }

  function handleTargetChange() {
    const el = getTargetElement();
    if (!el) return;

    const text = el.textContent || "";
    if (!text.trim()) return;

    scheduleTyping(text);
  }

  function disconnectObservers() {
    clearTimer();

    if (state.targetObserver) {
      state.targetObserver.disconnect();
      state.targetObserver = null;
    }

    if (state.bootObserver) {
      state.bootObserver.disconnect();
      state.bootObserver = null;
    }
  }

  function attachTargetObserver(el) {
    if (state.targetObserver) return;

    state.targetObserver = new MutationObserver(handleTargetChange);
    state.targetObserver.observe(el, {
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
