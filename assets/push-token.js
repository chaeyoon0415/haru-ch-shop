/* ===========================================================
   알림 받을 주소(FCM 토큰)를 받아 Firestore pushTokens/{uid} 에 적습니다.
   받는 조건: 알림 권한 granted + 로그인한 손님
   받는 때: ① 「알림 받기」로 granted 가 된 자리(window.HaruPushToken.register)
            ② 가게 화면을 열 때마다(auth.js 가 이 파일을 불러와 한 번 실행)
   토큰 값은 화면·Console 어디에도 찍지 않고, 실패하면 오류 이름만 한 줄 남깁니다.
   =========================================================== */
import { getMessaging, getToken, isSupported }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./auth.js";

const VAPID_KEY = "BEURvtO77QJ-xewpTYtoaZ7y07QTP6z9EqSxRJ45qQd4AnjODeCsGP8TpQlQhuTVXxjKCaXnYurPmAAiYclhcxg";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;   // 30일

let running = null;

async function run(user, skipIfFresh) {
  if (!user || !("Notification" in window) || Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator) || !(await isSupported())) return;

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const token = await getToken(getMessaging(auth.app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });
  if (!token) return;

  const ref = doc(getFirestore(auth.app), "pushTokens", user.uid);
  if (skipIfFresh) {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const saved = snap.data();
      const at = saved.updatedAt && saved.updatedAt.toMillis ? saved.updatedAt.toMillis() : 0;
      if (saved.token === token && Date.now() - at < MAX_AGE_MS) return;
    }
  }
  // merge: 문서가 있으면 이 두 필드만 고치고, 없으면 새로 만든다
  await setDoc(ref, { token: token, updatedAt: serverTimestamp() }, { merge: true });
}

function start(user, skipIfFresh) {
  if (running) return running;
  running = run(user, skipIfFresh)
    .catch(function (err) {
      console.warn("푸시 토큰 저장 실패: " + ((err && (err.code || err.name)) || "unknown"));
    })
    .finally(function () { running = null; });
  return running;
}

// ① 「알림 받기」로 granted 가 된 바로 그 자리 — 항상 새로 적는다
window.HaruPushToken = {
  register: function () { return start(auth.currentUser, false); }
};

// ② 화면을 열 때마다 — 같은 토큰이고 30일 안이면 다시 쓰지 않는다
const unsub = onAuthStateChanged(auth, function (user) {
  unsub();
  start(user, true);
});
