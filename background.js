const DEFAULT_ENABLED = true;
const STORAGE_KEYS = {
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
    const { hostname } = new URL(url);
    return hostname === "typingerz.com" || hostname.endsWith(".typingerz.com");
  } catch {
    return false;
  }
}

async function getEnabled() {
  const result = await chrome.storage.local.get({
    [STORAGE_KEYS.enabled]: DEFAULT_ENABLED,
  });
  return Boolean(result[STORAGE_KEYS.enabled]);
}

async function setVisualState(enabled) {
  const state = enabled ? "enabled" : "disabled";

  await Promise.all([
    chrome.action.setIcon({ path: ICONS[state] }),
    chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" }),
    chrome.action.setBadgeBackgroundColor({
      color: enabled ? "#1f7a3f" : "#666666",
    }),
    chrome.action.setTitle({
      title: `Typingerz Cheat Runner: ${enabled ? "ON" : "OFF"}`,
    }),
  ]);
}

async function syncVisualState() {
  await setVisualState(await getEnabled());
}

async function injectExternalScript(tabId, url) {
  if (!(await getEnabled())) return;
  if (!url || !isTypingerzUrl(url)) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["external.js"],
      world: "MAIN",
    });
  } catch (error) {
    const message = String(error?.message || error || "");
    if (message.includes("error page")) return;
    console.error("[Typingerz Cheat Runner] executeScript failed:", error);
  }
}

async function toggleEnabledState() {
  const nextEnabled = !(await getEnabled());
  await chrome.storage.local.set({ [STORAGE_KEYS.enabled]: nextEnabled });
  await setVisualState(nextEnabled);
  return nextEnabled;
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ [STORAGE_KEYS.enabled]: DEFAULT_ENABLED });
  await setVisualState(DEFAULT_ENABLED);
});

chrome.runtime.onStartup.addListener(syncVisualState);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[STORAGE_KEYS.enabled]) return;
  setVisualState(Boolean(changes[STORAGE_KEYS.enabled].newValue));
});

chrome.action.onClicked.addListener(async (tab) => {
  const enabled = await toggleEnabledState();

  if (enabled && tab?.id && tab.url && isTypingerzUrl(tab.url)) {
    await injectExternalScript(tab.id, tab.url);
  }
});

function handleNavigation(details) {
  if (details.frameId !== 0) return;
  if (!details.url || !isTypingerzUrl(details.url)) return;
  injectExternalScript(details.tabId, details.url);
}

chrome.webNavigation.onCompleted.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);
