import { getFunctions, httpsCallable }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./auth.js";

const askShopBot = httpsCallable(getFunctions(auth.app, "us-central1"), "askShopBot");

const fab = document.querySelector("#bot-fab");
const panel = document.querySelector("#bot-panel");
const log = document.querySelector("#bot-log");
const form = document.querySelector("#bot-form");
const input = document.querySelector("#bot-input");
const send = form.querySelector("button");
const close = document.querySelector("#bot-close");

let user = null;

function addMsg(text, who) {
  const p = document.createElement("p");
  p.className = "bot-msg bot-" + who;
  p.textContent = text;
  log.append(p);
  log.scrollTop = log.scrollHeight;
  return p;
}

onAuthStateChanged(auth, u => {
  user = u;
  form.hidden = !u;
  log.textContent = "";
  addMsg(u ? "궁금한 상품 이름이나 가격을 물어보세요." : "[로그인한 뒤에 물어볼 수 있어요]", "bot");
});

fab.addEventListener("click", () => {
  panel.hidden = !panel.hidden;
  if (!panel.hidden && user) input.focus();
});
close.addEventListener("click", () => { panel.hidden = true; });

form.addEventListener("submit", async e => {
  e.preventDefault();
  const question = input.value.trim();
  if (!question || !user) return;
  input.value = "";
  addMsg(question, "me");
  const wait = addMsg("답을 찾는 중…", "bot");
  send.disabled = true;
  try {
    const res = await askShopBot({ question });
    wait.textContent = res.data.answer;
  } catch (err) {
    wait.textContent = err && err.code === "functions/unauthenticated"
      ? "[로그인한 뒤에 물어볼 수 있어요]"
      : "지금은 답을 가져올 수 없어요. 잠시 뒤에 다시 물어봐 주세요.";
  } finally {
    send.disabled = false;
    log.scrollTop = log.scrollHeight;
  }
});
