import { getFirestore, collection, doc, getDocs, updateDoc }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./auth.js";

const db = getFirestore(auth.app);
const storage = getStorage(auth.app);   // 버킷은 firebaseConfig 의 storageBucket

const needLogin = document.querySelector("#login-needed");
const form = document.querySelector("#upload-form");
const select = document.querySelector("#product-select");
const fileInput = document.querySelector("#photo-file");
const btn = document.querySelector("#upload-photo");
const msg = document.querySelector("#upload-msg");

const errText = e => (e && e.code ? e.code + ": " : "") + (e && e.message ? e.message : String(e));

let loaded = false;
async function loadProducts() {
  if (loaded) return;
  loaded = true;
  try {
    const snap = await getDocs(collection(db, "products"));   // 숨긴 상품 포함 전부
    select.textContent = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "상품을 고르세요";
    select.append(first);
    snap.docs.forEach(d => {
      const o = document.createElement("option");
      o.value = d.id;
      o.textContent = d.id + (d.data().name ? " — " + d.data().name : "");
      select.append(o);
    });
  } catch (e) {
    loaded = false;
    msg.textContent = "상품을 읽지 못했습니다. " + errText(e);
  }
}

onAuthStateChanged(auth, user => {
  needLogin.hidden = !!user;
  form.hidden = !user;
  if (user) loadProducts();
});

btn.addEventListener("click", async () => {
  const id = select.value;
  const file = fileInput.files[0];
  if (!id) { msg.textContent = "상품을 먼저 고르세요."; return; }
  if (!file) { msg.textContent = "사진 파일을 먼저 고르세요."; return; }

  const path = "products/" + id + "/main.jpg";
  btn.disabled = true;
  msg.textContent = "올리는 중 … 0%";
  try {
    const task = uploadBytesResumable(ref(storage, path), file);   // 고른 파일 그대로
    task.on("state_changed", s => {
      msg.textContent = "올리는 중 … " + Math.floor(s.bytesTransferred / s.totalBytes * 100) + "%";
    });
    await task;
    await updateDoc(doc(db, "products", id), { imagePath: path });   // 다른 필드는 그대로, 경로만
    msg.textContent = "끝났습니다. " + path + " 를 " + id + " 상품의 imagePath 에 저장했습니다.";
  } catch (e) {
    console.error(e);
    msg.textContent = "실패했습니다. " + errText(e);
  } finally { btn.disabled = false; }
});
