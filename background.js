const DEFAULT_ENABLED = true;

const STORAGE_KEYS = Object.freeze({
  enabled: "enabled",
});

const ICONS = Object.freeze({
  enabled: Object.freeze({
    16: "icons/enabled-16.png",
    32: "icons/enabled-32.png",
    48: "icons/enabled-48.png",
    128: "icons/enabled-128.png",
  }),
  disabled: Object.freeze({
    16: "icons/disabled-16.png",
    32: "icons/disabled-32.png",
    48: "icons/disabled-48.png",
    128: "icons/disabled-128.png",
  }),
});

const ALLOWED_HOSTNAME = "typingerz.com";
const EXTENSION_LABEL = "TypingerZ Cheat Runner";

const state = {
  enabled: DEFAULT_ENABLED,
  ready: false,
};

let initPromise = null;
const injectionLocks = new Set();

function isTypingerzUrl(rawUrl) {
  if (typeof rawUrl !== "string" || rawUrl.length === 0) return false;

  try {
    const url = new URL(rawUrl);

    // http/https だけ許可
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    return (
      url.hostname === ALLOWED_HOSTNAME ||
      url.hostname.endsWith(`.${ALLOWED_HOSTNAME}`)
    );
  } catch {
    return false;
  }
}

async function loadEnabledFromStorage() {
  const result = await chrome.storage.local.get({
    [STORAGE_KEYS.enabled]: DEFAULT_ENABLED,
  });

  state.enabled = Boolean(result[STORAGE_KEYS.enabled]);
  return state.enabled;
}

async function persistEnabled(enabled) {
  state.enabled = Boolean(enabled);
  await chrome.storage.local.set({ [STORAGE_KEYS.enabled]: state.enabled });
  return state.enabled;
}

async function applyVisualState(enabled) {
  const key = enabled ? "enabled" : "disabled";

  await Promise.allSettled([
    chrome.action.setIcon({ path: ICONS[key] }),
    chrome.action.setTitle({
      title: `${EXTENSION_LABEL}: ${enabled ? "ON" : "OFF"}`,
    }),
  ]);
}

async function ensureInitialized({ reset = false } = {}) {
  if (!initPromise) {
    initPromise = (async () => {
      if (reset) {
        await persistEnabled(DEFAULT_ENABLED);
      } else {
        await loadEnabledFromStorage();
      }
      await applyVisualState(state.enabled);
      state.ready = true;
    })().catch((error) => {
      console.error(`[${EXTENSION_LABEL}] initialization failed:`, error);
      state.ready = false;
      throw error;
    });
  }

  return initPromise;
}

async function syncVisualState() {
  await ensureInitialized();
  await applyVisualState(state.enabled);
}

async function toggleEnabledState() {
  await ensureInitialized();
  return persistEnabled(!state.enabled);
}

async function injectExternalScript(tabId, url) {
  await ensureInitialized();

  if (!state.enabled) return;
  if (typeof tabId !== "number") return;
  if (!isTypingerzUrl(url)) return;

  // 同一タブでの同時注入を抑止
  if (injectionLocks.has(tabId)) return;
  injectionLocks.add(tabId);

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["external.js"],
      world: "MAIN",
    });
  } catch (error) {
    const message = String(error?.message || error || "");

    // エラーページ等では失敗しても問題にしない
    if (message.includes("error page")) return;

    console.error(`[${EXTENSION_LABEL}] executeScript failed:`, error);
  } finally {
    injectionLocks.delete(tabId);
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await ensureInitialized({ reset: true });
  } catch {
    // ここでは握りつぶし、次回起動時の復旧に任せる
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await syncVisualState();
  } catch {
    // 同上
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  const change = changes[STORAGE_KEYS.enabled];
  if (!change) return;

  state.enabled = Boolean(change.newValue);
  void applyVisualState(state.enabled);
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const enabled = await toggleEnabledState();

    if (enabled && tab?.id && tab?.url) {
      await injectExternalScript(tab.id, tab.url);
    }
  } catch (error) {
    console.error(`[${EXTENSION_LABEL}] action click failed:`, error);
  }
});

function handleNavigation(details) {
  if (details.frameId !== 0) return;
  if (!details?.url) return;
  if (!isTypingerzUrl(details.url)) return;

  void injectExternalScript(details.tabId, details.url);
}

chrome.webNavigation.onCompleted.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);
