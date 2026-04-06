const DEFAULT_CODE = `// ここに実行したい JS を保存してください。
// 例:
console.log("[Typingerz JS Runner] loaded:", location.href);`;

const codeEl = document.getElementById("code");
const saveBtn = document.getElementById("save");
const resetBtn = document.getElementById("reset");
const statusEl = document.getElementById("status");

function setStatus(message) {
  statusEl.textContent = message;
  if (message) {
    setTimeout(() => {
      if (statusEl.textContent === message) statusEl.textContent = "";
    }, 2500);
  }
}

async function load() {
  const { userCode } = await chrome.storage.local.get({ userCode: DEFAULT_CODE });
  codeEl.value = userCode;
}

async function save() {
  await chrome.storage.local.set({ userCode: codeEl.value });
  setStatus("保存しました");
}

saveBtn.addEventListener("click", save);
resetBtn.addEventListener("click", async () => {
  codeEl.value = DEFAULT_CODE;
  await save();
});

load().catch((error) => {
  console.error(error);
  setStatus("読み込みエラー");
});
