const DEFAULT_CODE = `// ここに実行したい JS を保存してください。
// 例:
console.log("[Typingerz JS Runner] loaded:", location.href);`;

const STORAGE_KEYS = {
  userCode: "userCode",
  enabled: "enabled",
};

const ICONS = {
  enabled: {
    16: "icons/enabled-16.png",
    32: "icons/enabled-32.png",
    48: "icons/enabled-48.png",
    128: "icons/enabled-128.png",
  },
  disabled: {
    16: "icons/disabled-16.png",
    32: "icons/disabled-32.png",
    48: "icons/disabled-48.png",
    128: "icons/disabled-128.png",
  },
};

function isTypingerzUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === "typingerz.com" || u.hostname.endsWith(".typingerz.com");
  } catch {
    return false;
  }
}

async function getSettings() {
  const result = await chrome.storage.local.get({
    [STORAGE_KEYS.userCode]: DEFAULT_CODE,
    [STORAGE_KEYS.enabled]: true,
  });
  return {
    userCode: String(result[STORAGE_KEYS.userCode] ?? ""),
    enabled: Boolean(result[STORAGE_KEYS.enabled]),
  };
}

async function setVisualState(enabled) {
  const state = enabled ? "enabled" : "disabled";
  await chrome.action.setIcon({ path: ICONS[state] });
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#1f7a3f" : "#666666" });
  await chrome.action.setTitle({
    title: enabled
      ? "Typingerz JS Runner: ON"
      : "Typingerz JS Runner: OFF",
  });
}

async function injectUserCode(tabId) {
  const { userCode, enabled } = await getSettings();
  if (!enabled || !userCode.trim()) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: (code) => {
        try {
          (0, eval)(code);
        } catch (error) {
          console.error("[Typingerz JS Runner] injected code failed:", error);
        }
      },
      args: [userCode],
    });
  } catch (error) {
    console.error("[Typingerz JS Runner] executeScript failed:", error);
  }
}

async function syncStateFromStorage() {
  const { enabled } = await getSettings();
  await setVisualState(enabled);
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    [STORAGE_KEYS.userCode]: DEFAULT_CODE,
    [STORAGE_KEYS.enabled]: true,
  });
  await setVisualState(true);
});

chrome.runtime.onStartup.addListener(syncStateFromStorage);

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") return;
  if (changes[STORAGE_KEYS.enabled]) {
    await setVisualState(Boolean(changes[STORAGE_KEYS.enabled].newValue));
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  const { enabled } = await getSettings();
  const nextEnabled = !enabled;
  await chrome.storage.local.set({ [STORAGE_KEYS.enabled]: nextEnabled });
  await setVisualState(nextEnabled);

  if (nextEnabled && tab?.id && tab.url && isTypingerzUrl(tab.url)) {
    await injectUserCode(tab.id);
  }
});

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url || !isTypingerzUrl(details.url)) return;
  injectUserCode(details.tabId);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  if (!details.url || !isTypingerzUrl(details.url)) return;
  injectUserCode(details.tabId);
});
