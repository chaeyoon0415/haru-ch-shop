import { getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter, runTransaction, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { auth } from "./auth.js";

const db = getFirestore(auth.app);
const storage = getStorage(auth.app);
const countBox = document.querySelector("#read-count");

const errText = e => (e && e.code ? e.code + ": " : "") + (e && e.message ? e.message : String(e));
const showError = e => { countBox.textContent = "상품을 읽지 못했습니다. " + errText(e); };

// 숨기지 않은 상품만, 싼 것부터, 셋만 — 필터·정렬·개수 모두 Firestore 쿼리에서 한다
const PAGE = 3;
const moreBtn = document.querySelector("#load-more");
let lastDoc = null;   // 지금 보이는 마지막 상품 문서
let readTotal = 0;    // 이번 화면에서 읽은 문서 합계

function listQuery(after) {
  const parts = [collection(db, "products"), where("isVisible", "==", true), orderBy("price", "asc")];
  if (after) parts.push(startAfter(after));
  parts.push(limit(PAGE));
  return query(...parts);
}

// imagePath 가 있는 상품만 사진으로 바꾼다. 문서를 읽는 것이 아니므로 읽은 문서 수에 더하지 않는다
function paintImages(items) {
  items.filter(p => p.imagePath).forEach(async p => {
    try {
      const url = await getDownloadURL(ref(storage, p.imagePath));
      const thumb = document.querySelector('a.card[href="product.html?id=' + encodeURIComponent(p.id) + '"] .thumb');
      if (!thumb) return;
      const img = document.createElement("img");
      img.src = url;
      img.alt = p.name || "";
      thumb.textContent = "";
      thumb.append(img);
    } catch (e) { console.error(e); }   // 실패하면 그림 글자 그대로
  });
}

async function loadList(more = false) {
  if (moreBtn) moreBtn.disabled = true;
  try {
    const snap = await getDocs(listQuery(more ? lastDoc : null));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    paintList(items, more);
    paintImages(items);
    readTotal = (more ? readTotal : 0) + snap.size;
    if (snap.size) lastDoc = snap.docs[snap.docs.length - 1];
    countBox.textContent = readCountText(readTotal);
    if (moreBtn) moreBtn.hidden = snap.size < PAGE;
  } catch (e) {
    console.error(e);
    if (more) countBox.textContent = "더 불러오지 못했습니다. " + errText(e);
    else {
      document.querySelector("#product-list").textContent = "목록을 불러오지 못했습니다";
      countBox.textContent = "";
    }
  } finally { if (moreBtn) moreBtn.disabled = false; }
}

// 상세 화면 사진: imagePath 가 있을 때만 바꾼다. 문서를 읽는 것이 아니므로 읽은 문서 수는 그대로
async function paintDetailImage(data) {
  if (!data.imagePath) return;
  try {
    const url = await getDownloadURL(ref(storage, data.imagePath));
    const thumb = document.querySelector("#product-detail .thumb");
    if (!thumb) return;
    const img = document.createElement("img");
    img.src = url;
    img.alt = data.name || "";
    thumb.textContent = "";
    thumb.append(img);
  } catch (e) { console.error(e); }   // 실패하면 그림 글자 그대로
}

async function loadDetail() {
  try {
    const snap = await getDoc(doc(db, "products", qs("id") || "_"));
    const data = snap.exists() ? snap.data() : null;
    paintDetail(data && data.isVisible !== false ? { id: snap.id, ...data } : null);
    countBox.textContent = readCountText(snap.exists() ? 1 : 0);
    if (data && data.isVisible !== false) { setupOrder(snap.id); paintDetailImage(data); }
  } catch (e) { showError(e); }
}

// 「바로 주문」: 재고 확인 · 주문 문서 쓰기 · 재고 차감을 한 트랜잭션으로
function setupOrder(productId) {
  const btn = document.querySelector("#order-now");
  const msg = document.querySelector("#order-msg");
  if (!btn || !msg) return;

  btn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) { msg.textContent = "로그인이 필요합니다"; return; }
    btn.disabled = true;
    msg.textContent = "주문하는 중…";
    try {
      const pRef = doc(db, "products", productId);
      const oRef = doc(collection(db, "orders"));   // 자동 ID
      const outOfStock = await runTransaction(db, async tx => {
        const pSnap = await tx.get(pRef);
        const p = pSnap.exists() ? pSnap.data() : null;
        if (!p || typeof p.stock !== "number" || p.stock < 1) return true;
        tx.set(oRef, {
          userId: user.uid,
          items: [{ productId, name: p.name, price: p.price, quantity: 1 }],
          totalPrice: p.price * 1 + (p.price * 1 >= 50000 ? 0 : 3000),   // 배송비 포함
          status: "paid",
          createdAt: serverTimestamp()
        });
        tx.update(pRef, { stock: p.stock - 1 });
        return false;
      });
      if (outOfStock) { msg.textContent = "재고가 없습니다"; return; }
      msg.textContent = "주문했습니다. (주문번호 " + oRef.id + ")";
      if (window.HaruPush) HaruPush.mount(msg);
      const stockEl = document.querySelector("#product-detail .stock");
      const cur = stockEl && stockEl.textContent.match(/\d+/);
      if (cur) stockEl.textContent = stockText(Number(cur[0]) - 1);
    } catch (e) {
      console.error(e);
      msg.textContent = "주문하지 못했습니다. " + errText(e);
    } finally { btn.disabled = false; }
  });
}

if (document.querySelector("#product-list")) {
  loadList();
  if (moreBtn) moreBtn.addEventListener("click", () => loadList(true));
}
else if (document.querySelector("#product-detail")) loadDetail();
