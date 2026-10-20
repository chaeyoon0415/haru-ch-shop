/* ===========================================================
   하루상점 — 화면을 그리고 장바구니를 다루는 코드
   이 파일은 고치지 않아도 됩니다. (상품은 shop.js 에 있습니다)
   =========================================================== */

const won = n => n.toLocaleString("ko-KR") + "원";
const findProduct = id => PRODUCTS.find(p => p.id === id);
const qs = key => new URLSearchParams(location.search).get(key);

/* --- 장바구니는 브라우저에 저장합니다 --- */
const Cart = {
  read() {
    try { return JSON.parse(localStorage.getItem("haru_cart") || "[]"); }
    catch (e) { return []; }
  },
  write(items) {
    localStorage.setItem("haru_cart", JSON.stringify(items));
  },
  add(id) {
    const items = Cart.read();
    const hit = items.find(i => i.id === id);
    if (hit) hit.qty += 1;
    else items.push({ id, qty: 1 });
    Cart.write(items);

    // 담은 상품의 이름과 가격을 상품 목록에서 찾아 온다
const p = findProduct(id);
// 통로가 이미 있으면 그대로 쓰고, 없을 때만 새로 만든다
window.dataLayer = window.dataLayer || [];
// 앞에서 넣은 상품 값이 섞이지 않게 먼저 비운다
dataLayer.push({ ecommerce: null });
// 통로 끝에 한 덩어리를 넣는다 - 넣는 순간이 태그 관리자가 듣는 순간
dataLayer.push({
  // 무슨 일이 일어났나 - 계획서 이름 글자 그대로
  event: "add_to_cart",
  // 같이 보내는 상품 값 묶음
  ecommerce: {
    // 어느 나라 돈인가
    currency: "KRW",
    // 금액 - 한 번 누르면 한 개라 그 상품 가격 하나
    value: p.price,
    // 담은 상품 상자 하나를 목록에 넣는다
    items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: 1 }]
  }
});

  },
  remove(id) {
    Cart.write(Cart.read().filter(i => i.id !== id));
  },
  clear() {
    localStorage.removeItem("haru_cart");
  },
  count() {
    return Cart.read().reduce((sum, i) => sum + i.qty, 0);
  },
  total() {
    return Cart.read().reduce((sum, i) => {
      const p = findProduct(i.id);
      return sum + (p ? p.price * i.qty : 0);
    }, 0);
  }
};

/* --- 머리글과 꼬리글 --- */
function paintChrome() {
  // 화면마다 제목이 달라야 검색에서 구분됩니다.
  // 그래서 제목을 통째로 바꾸지 않고 가게 이름만 갈아 끼웁니다.
  document.title = document.title.replaceAll("하루상점", SHOP.name);

  const brand = document.querySelector(".brand");
  if (brand) brand.textContent = SHOP.name;

  const badge = document.querySelector(".cart-count");
  if (badge) badge.textContent = Cart.count();

  const foot = document.querySelector("footer.site .wrap");
  if (foot) foot.textContent = SHOP.name + " · " + SHOP.tagline;
}

/* --- 상품 목록 --- */
// 이름·가격·한 줄 소개·재고는 Firestore(products.js 가 읽어 옴)에서 받는다.
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const stockText = n => (typeof n !== "number" ? "" : n > 0 ? "재고 " + n + "개" : "품절");
const readCountText = n => "이번 화면에서 읽은 문서 " + n + "장";

function paintList(items, append = false) {
  const box = document.querySelector("#product-list");
  if (!box) return;

  document.querySelector("#hero-title").textContent = SHOP.name;
  document.querySelector("#hero-tagline").textContent = SHOP.tagline;

  const html = items.map(p => `
    <a class="card" href="product.html?id=${esc(p.id)}">
      <div class="thumb">${findProduct(p.id).emoji}</div>
      <h3>${esc(p.name)}</h3>
      <p class="sum">${esc(p.summary)}</p>
      <div class="price">${won(p.price)}</div>
      <p class="stock">${stockText(p.stock)}</p>
    </a>`).join("");
  if (append) box.insertAdjacentHTML("beforeend", html);
  else box.innerHTML = html;
}

/* --- 상품 상세 --- */
function paintDetail(fsDoc) {
  const box = document.querySelector("#product-detail");
  if (!box) return;

  const local = findProduct(qs("id"));
  const p = local && fsDoc ? { ...local, ...fsDoc } : null;
  if (!p) { box.innerHTML = '<p class="empty">그런 상품이 없습니다.</p>'; return; }

  document.title = p.name + " — " + SHOP.name;
  box.innerHTML = `
    <div class="thumb">${p.emoji}</div>
    <div>
      <h1>${esc(p.name)}</h1>
      <div class="price">${won(p.price)}</div>
      <p class="stock">${stockText(p.stock)}</p>
      <div class="body prose">${p.detail.map(t => `<p>${t}</p>`).join("")}</div>
      <button class="btn" id="add-to-cart">장바구니에 담기</button>
      <button class="btn" id="order-now" type="button">바로 주문</button>
      <p class="order-msg" id="order-msg" role="status"></p>
    </div>`;

  window.dataLayer = window.dataLayer || [];
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "view_item",
    ecommerce: {
      currency: "KRW",
      value: p.price,
      items: [{ item_id: p.id, item_name: p.name, price: p.price, quantity: 1 }]
    }
  });

  document.querySelector("#add-to-cart").addEventListener("click", () => {
    Cart.add(p.id);
    location.href = "cart.html";
  });
}

/* --- 장바구니 --- */
function paintCart() {
  const box = document.querySelector("#cart-box");
  if (!box) return;

  const items = Cart.read();
  if (items.length === 0) {
    box.innerHTML = '<p class="empty">장바구니가 비어 있습니다.</p>';
    return;
  }

  box.innerHTML = `
    <table class="cart">
      <tr><th>상품</th><th>수량</th><th>금액</th><th></th></tr>
      ${items.map(i => {
        const p = findProduct(i.id);
        if (!p) return "";
        return `<tr>
          <td>${p.emoji} ${p.name}</td>
          <td>${i.qty}</td>
          <td>${won(p.price * i.qty)}</td>
          <td><button class="btn ghost drop" data-id="${p.id}">빼기</button></td>
        </tr>`;
      }).join("")}
    </table>
    <div class="total">합계 ${won(Cart.total())}</div>
    <p class="lead">배송비 안내: 5만 원 이상 구매 시 무료배송, 그 미만은 배송비 3,000원이 별도로 부과됩니다.</p>
    <div class="total">배송비 포함 최종 결제금액 ${won(Cart.total() + (Cart.total() >= 50000 ? 0 : 3000))}</div>
    <a class="btn" href="checkout.html">결제하기</a>`;

  box.querySelectorAll(".drop").forEach(b => {
    b.addEventListener("click", () => { Cart.remove(b.dataset.id); location.reload(); });
  });
}

/* --- 결제 --- */
function paintCheckout() {
  const form = document.querySelector("#pay-form");
  if (!form) return;

  const sum = document.querySelector("#pay-total");
  if (sum) sum.textContent = won(Cart.total());

  const shippingFee = Cart.total() >= 50000 ? 0 : 3000;
  const grandTotal = document.querySelector("#pay-grand-total");
  if (grandTotal) grandTotal.textContent = won(Cart.total() + shippingFee);

  // ▼ 여기에 「결제 화면이 열렸다」를 알리는 코드가 들어갑니다 (뒤 수업에서)
  const checkoutTotal = Cart.total();
  window.dataLayer = window.dataLayer || [];
  dataLayer.push({ ecommerce: null });
  dataLayer.push({
    event: "begin_checkout",
    free_shipping: checkoutTotal >= 50000 ? "yes" : "no",
    ecommerce: {
      currency: "KRW",
      value: checkoutTotal,
      items: Cart.read().filter(i => findProduct(i.id)).map(i => {
        const p = findProduct(i.id);
        return { item_id: p.id, item_name: p.name, price: p.price, quantity: i.qty };
      })
    }
  });

  form.addEventListener("submit", e => {
    e.preventDefault();

    // 포트원 결제창(테스트). 결과는 주문 완료 화면(done.html)이 받아서 처리한다
    const paymentId = "HARU-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    const lines = Cart.read().filter(i => findProduct(i.id));
    if (!lines.length) return;
    const orderName = findProduct(lines[0].id).name + (lines.length > 1 ? " 외 " + (lines.length - 1) + "건" : "");

    const redirectUrl = location.origin + "/done.html";

    PortOne.requestPayment({
      storeId: "store-78f23d3f-f909-47e0-9fe6-048909d77c96",
      channelKey: "channel-key-9c93becb-a2fe-4e44-a4d5-0dae650ce6b0",
      paymentId: paymentId,
      orderName: orderName,
      totalAmount: Cart.total() + shippingFee,
      currency: "CURRENCY_KRW",
      payMethod: "CARD",
      customData: { items: Cart.read() },
      redirectUrl: redirectUrl
    }).then(response => {
      // PC: 휴대폰 리다이렉트와 같은 모양(paymentId · code · message)으로 넘긴다
      const q = new URLSearchParams();
      ["paymentId", "code", "message"].forEach(k => {
        if (response && response[k] != null) q.set(k, response[k]);
      });
      if (!q.has("paymentId")) q.set("paymentId", paymentId);
      location.href = redirectUrl + "?" + q.toString();
    });
  });
}

/* --- 가게 소개·배송 안내 글 --- */
function paintProse() {
  const about = document.querySelector("#about-body");
  if (about) about.innerHTML = SHOP.about.map(t => `<p>${t}</p>`).join("");

  const ship = document.querySelector("#shipping-body");
  if (ship) ship.innerHTML = SHOP.shipping.map(t => `<p>${t}</p>`).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  paintChrome();
  // 목록·상세는 Firestore 에서 읽은 뒤 products.js 가 paintList / paintDetail 을 부른다
  paintCart();
  paintCheckout();
  paintProse();
});
