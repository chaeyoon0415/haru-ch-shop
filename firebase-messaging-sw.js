/* ===========================================================
   하루상점 — 웹 푸시 알림을 받는 서비스 워커
   가게 화면(assets/auth.js)과 같은 Firebase 버전·설정을 씁니다.
   지금은 알림을 받을 준비까지만 합니다.
   =========================================================== */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDavrwZtFJrgJXWEe_GPlr4QHXpMlMBsvw",
  authDomain: "haru-ch-shop.firebaseapp.com",
  projectId: "haru-ch-shop",
  storageBucket: "haru-ch-shop.firebasestorage.app",
  messagingSenderId: "971703720070",
  appId: "1:971703720070:web:df10e702482b8882475907"
});

// 알림을 받을 준비 (백그라운드 메시지를 받는 연결)
firebase.messaging();
