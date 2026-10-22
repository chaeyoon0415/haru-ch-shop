import { getFirestore, collection, doc, getDocs, updateDoc, query, where, limit }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getFunctions, httpsCallable }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./auth.js";

const db = getFirestore(auth.app);

const needLogin = document.querySelector("#login-needed");
const main = document.querySelector("#rc-main");
const who = document.querySelector("#rc-who");
const out = document.querySelector("#rc-out");
const btnRead = document.querySelector("#btn-read-orders");
const btnFix = document.querySelector("#btn-fix-order");
const btnZero = document.querySelector("#btn-zero-price");
const btnAsk = document.querySelector("#btn-ask-total");
const btnAskPrice = document.querySelector("#btn-ask-total-price");
const btnAskZero = document.querySelector("#btn-ask-zero");

const calcOrderTotal = httpsCallable(getFunctions(auth.app, "us-central1"), "calcOrderTotal");

const errText = e => (e && e.code ? e.code + ": " : "") + (e && e.message ? e.message : String(e));

let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
  needLogin.hidden = !!user;
  main.hidden = !user;
  out.textContent = "";
  who.textContent = user ? "이메일: " + (user.email || "") + "\nUID: " + user.uid : "";
  who.style.whiteSpace = "pre-wrap";
});

async function run(button, work) {
  button.disabled = true;
  out.textContent = "";
  try {
    await work();
  } catch (e) {
    console.error(e);
    out.textContent = "실패했습니다.\n" + errText(e);
  } finally { button.disabled = false; }
}

btnRead.addEventListener("click", () => run(btnRead, async () => {
  const snap = await getDocs(collection(db, "orders"));
  const others = snap.docs.filter(d => d.data().userId !== currentUser.uid).length;

  const summary = document.createElement("p");
  summary.className = "rc-summary";
  summary.textContent = "전체 " + snap.size + "건, 그중 userId 가 내 UID와 다른 것 " + others + "건";

  const table = document.createElement("table");
  table.className = "rc-table";
  const head = table.createTHead().insertRow();
  ["문서 ID", "userId", "totalPrice"].forEach(t => {
    const th = document.createElement("th");
    th.textContent = t;
    head.append(th);
  });
  const body = table.createTBody();
  snap.docs.forEach(d => {
    const data = d.data();
    const row = body.insertRow();
    [d.id, data.userId, data.totalPrice].forEach(v => {
      row.insertCell().textContent = v === undefined ? "" : String(v);
    });
  });

  const wrap = document.createElement("div");
  wrap.className = "rc-table-wrap";
  wrap.append(table);
  out.textContent = "";
  out.append(summary, wrap);
}));

btnFix.addEventListener("click", () => run(btnFix, async () => {
  const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", currentUser.uid), limit(1)));
  if (snap.empty) { out.textContent = "내 UID 와 같은 userId 의 주문이 없습니다."; return; }
  const id = snap.docs[0].id;
  await updateDoc(doc(db, "orders", id), { totalPrice: 1 });
  out.textContent = "성공했습니다. orders/" + id + " 의 totalPrice 를 1 로 바꿨습니다.";
}));

btnZero.addEventListener("click", () => run(btnZero, async () => {
  await updateDoc(doc(db, "products", "p1"), { price: 0 });
  out.textContent = "성공했습니다. products/p1 의 price 를 0 으로 바꿨습니다.";
}));

btnAsk.addEventListener("click", () => run(btnAsk, async () => {
  const res = await calcOrderTotal({ productId: "p1", quantity: 2 });
  out.textContent = "totalPrice: " + res.data.totalPrice;
}));

btnAskPrice.addEventListener("click", () => run(btnAskPrice, async () => {
  const res = await calcOrderTotal({ productId: "p1", quantity: 2, price: 100 });
  out.textContent = "totalPrice: " + res.data.totalPrice;
}));

btnAskZero.addEventListener("click", () => run(btnAskZero, async () => {
  const res = await calcOrderTotal({ productId: "p1", quantity: 0 });
  out.textContent = "totalPrice: " + res.data.totalPrice;
}));
