import { getFirestore, doc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./auth.js";

// 포트원 결제 결과를 받는 곳: 주소의 paymentId · code · message 를 읽는다
const params = new URLSearchParams(location.search);
const code = params.get("code");
const paymentId = params.get("paymentId");
const msg = document.querySelector("#done-msg");
const errText = e => (e && e.code ? e.code + ": " : "") + (e && e.message ? e.message : String(e));

if (code) {
  // 실패나 닫기: 주문도 만들지 않고 장바구니도 그대로 둔다
  msg.textContent = (params.get("message") || "") + "\n장바구니는 그대로입니다";
} else if (paymentId) {
  const unsub = onAuthStateChanged(auth, async user => {
    unsub();
    if (!user) { msg.textContent = "로그인하세요"; return; }
    try {
      const lines = Cart.read().filter(i => findProduct(i.id));
      const items = lines.map(i => {
        const p = findProduct(i.id);
        return { productId: p.id, name: p.name, price: p.price, quantity: i.qty };
      });
      const total = Cart.total();
      await setDoc(doc(getFirestore(auth.app), "orders", paymentId), {
        userId: user.uid,
        items: items,
        totalPrice: total,
        status: "paid",
        createdAt: serverTimestamp(),
        paymentId: paymentId
      });
      Cart.clear();
      window.dataLayer = window.dataLayer || [];
      dataLayer.push({ ecommerce: null });
      dataLayer.push({
        event: "purchase",
        ecommerce: {
          transaction_id: paymentId,
          currency: "KRW",
          value: total,
          items: lines.map(i => {
            const p = findProduct(i.id);
            return { item_id: p.id, item_name: p.name, price: p.price, quantity: i.qty };
          })
        }
      });
      document.querySelector("#done-pid").textContent = "결제 ID: " + paymentId;
      document.querySelector("#done-ok").hidden = false;
    } catch (e) {
      console.error(e);
      msg.textContent = "주문을 저장하지 못했습니다. " + errText(e);
    }
  });
}
