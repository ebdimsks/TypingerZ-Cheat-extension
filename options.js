const DEFAULT_CODE = `function tyTex(text) {
  let typeTarget = text.split("");

  typeTarget.forEach((character) => {
    if (character === "n") {
      let customKeyEvent = new KeyboardEvent('keydown', {
        key: character,
        code: "KeyN",
        location: 0,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        repeat: false,
        isComposing: false,
        charCode: 0,
        keyCode: 78,
        which: 78,
      });

      document.dispatchEvent(customKeyEvent);

      customKeyEvent = new KeyboardEvent('keyup', {
        key: character,
        code: "KeyN",
        location: 0,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        repeat: false,
        isComposing: false,
        charCode: 0,
        keyCode: 78,
        which: 78,
      });

      document.dispatchEvent(customKeyEvent);
    } else {
      let keyEvent = new KeyboardEvent('keydown', {
        key: character,
        code: `Key${character.toUpperCase()}`
      });

      document.dispatchEvent(keyEvent);

      let keyUpEvent = new KeyboardEvent('keyup', {
        key: character,
        code: `Key${character.toUpperCase()}`
      });

      document.dispatchEvent(keyUpEvent);
    }
  });
}


function handMond() {
  let textContent = document.getElementById("mondaifield").textContent;
  tyTex(textContent);
}

setInterval(handMond, 10);`;

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
