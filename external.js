(() => {
  "use strict";

  const TARGET_ID = "mondaifield";
  let lastTypedText = "";
  let observerStarted = false;

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

  function tyTex(text) {
    if (!text || text === lastTypedText) return;
    lastTypedText = text;

    for (const character of text.split("")) {
      const { key, code } = getKeyInfo(character);
      dispatchKey("keydown", key, code);
      dispatchKey("keyup", key, code);
    }
  }

  function handMond() {
    const target = document.getElementById(TARGET_ID);
    if (!target) return;

    const textContent = target.textContent || "";
    if (!textContent.trim()) return;

    tyTex(textContent);
  }

  function startObserver() {
    if (observerStarted) return;
    observerStarted = true;

    const observer = new MutationObserver(() => {
      handMond();
    });

    const attach = () => {
      const target = document.getElementById(TARGET_ID);
      if (!target) return false;

      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      return true;
    };

    if (attach()) {
      handMond();
      return;
    }

    const bootObserver = new MutationObserver(() => {
      if (attach()) {
        bootObserver.disconnect();
        handMond();
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