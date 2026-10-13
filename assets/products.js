import { getFirestore, collection, doc, getDoc, getDocs, query, where, orderBy, limit, runTransaction, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./auth.js";

const db = getFirestore(auth.app);
const countBox = document.querySelector("#read-count");

// 올려 둘 재고와 보이기 값 (이름·가격·소개는 shop.js 값 그대로)
const SEED = { p2: [30, true], p3: [8, true], p4: [0, true], p5: [5, true], p6: [40, true] };

const errText = e => (e && e.code ? e.code + ": " : "") + (e && e.message ? e.message : String(e));
const showError = e => { countBox.textContent = "상품을 읽지 못했습니다. " + errText(e); };

// 숨기지 않은 상품만, 싼 것부터, 셋만 — 필터·정렬·개수 모두 Firestore 쿼리에서 한다
async function loadList() {
  try {
    const snap = await getDocs(query(
      collection(db, "products"),
      where("isVisible", "==", true),
      orderBy("price", "asc"),
      limit(3)
    ));
    paintList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    countBox.textContent = readCountText(snap.size);
  } catch (e) {
    console.error(e);
    document.querySelector("#product-list").textContent = "목록을 불러오지 못했습니다";
    countBox.textContent = "";
  }
}

async function loadDetail() {
  try {
    const snap = await getDoc(doc(db, "products", qs("id") || "_"));
    const data = snap.exists() ? snap.data() : null;
    paintDetail(data && data.isVisible !== false ? { id: snap.id, ...data } : null);
    countBox.textContent = readCountText(snap.exists() ? 1 : 0);
  } catch (e) { showError(e); }
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

if (document.querySelector("#product-list")) { loadList(); setupUpload(); }
else if (document.querySelector("#product-detail")) loadDetail();
