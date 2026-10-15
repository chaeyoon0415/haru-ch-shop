import { getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter, runTransaction, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./auth.js";

const db = getFirestore(auth.app);
const storage = getStorage(auth.app);
const countBox = document.querySelector("#read-count");

// 올려 둘 재고와 보이기 값 (이름·가격·소개는 shop.js 값 그대로)
const SEED = { p2: [30, true], p3: [8, true], p4: [0, true], p5: [5, true], p6: [40, true] };

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
          totalPrice: p.price * 1,
          status: "paid",
          createdAt: serverTimestamp()
        });
        tx.update(pRef, { stock: p.stock - 1 });
        return false;
      });
      if (outOfStock) { msg.textContent = "재고가 없습니다"; return; }
      msg.textContent = "주문했습니다. (주문번호 " + oRef.id + ")";
      const stockEl = document.querySelector("#product-detail .stock");
      const cur = stockEl && stockEl.textContent.match(/\d+/);
      if (cur) stockEl.textContent = stockText(Number(cur[0]) - 1);
    } catch (e) {
      console.error(e);
      msg.textContent = "주문하지 못했습니다. " + errText(e);
    } finally { btn.disabled = false; }
  });
}

// 로그인한 사람에게만 「상품 올리기」 버튼을 보여 준다
function setupUpload() {
  const box = document.querySelector("#upload-box");
  const btn = document.querySelector("#upload-products");
  const result = document.querySelector("#upload-result");
  onAuthStateChanged(auth, user => { box.hidden = !user; });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    result.textContent = "올리는 중…";
    try {
      const ids = Object.keys(SEED);
      // 한 번에 다섯 장: 하나라도 이미 있거나 실패하면 아무것도 올리지 않는다
      await runTransaction(db, async tx => {
        const refs = ids.map(id => doc(db, "products", id));
        const snaps = await Promise.all(refs.map(r => tx.get(r)));
        const exists = snaps.filter(s => s.exists()).map(s => s.id);
        if (exists.length) throw new Error("이미 있는 상품이라 하나도 올리지 않았습니다: " + exists.join(", "));
        ids.forEach((id, i) => {
          const p = findProduct(id);
          tx.set(refs[i], {
            name: p.name, price: p.price, summary: p.summary,
            stock: SEED[id][0], isVisible: SEED[id][1], createdAt: serverTimestamp()
          });
        });
      });
      result.textContent = "상품 5장(p2~p6)을 products 에 올렸습니다.";
      loadList();
    } catch (e) {
      result.textContent = "올리지 못했습니다. " + errText(e);
    } finally { btn.disabled = false; }
  });
}

if (document.querySelector("#product-list")) {
  loadList();
  setupUpload();
  if (moreBtn) moreBtn.addEventListener("click", () => loadList(true));
}
else if (document.querySelector("#product-detail")) loadDetail();
