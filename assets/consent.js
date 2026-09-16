/* ===========================================================
   동의 배너 — ad_storage, analytics_storage, ad_user_data,
   ad_personalization 네 신호의 동의 상태를 관리합니다.
   태그 관리자 스크립트보다 반드시 앞에서 실행되어야 합니다.
   =========================================================== */
(function () {
  const STORAGE_KEY = "haru_consent"; // "granted" | "denied"
  const CONSENT_TYPES = ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"];

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function stateFrom(granted) {
    const state = {};
    CONSENT_TYPES.forEach(function (t) { state[t] = granted ? "granted" : "denied"; });
    return state;
  }

  const saved = localStorage.getItem(STORAGE_KEY);

  // 기본값: 저장된 선택이 없으면 네 신호 모두 denied
  gtag("consent", "default", stateFrom(saved === "granted"));

  const style = document.createElement("style");
  style.textContent = [
    "#consent-banner{position:fixed;left:0;right:0;bottom:0;z-index:9999;",
    "display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;",
    "padding:14px 20px;background:#1f1f1f;color:#f5f5f5;font-size:13px;line-height:1.5;",
    "box-shadow:0 -2px 10px rgba(0,0,0,.15);}",
    "#consent-banner p{margin:0;flex:1 1 240px;}",
    "#consent-banner .consent-actions{display:flex;gap:8px;flex:0 0 auto;}",
    "#consent-banner button{border:1px solid #666;background:transparent;color:#f5f5f5;",
    "padding:8px 16px;border-radius:6px;font-size:13px;cursor:pointer;}",
    "#consent-banner button#consent-accept{background:#f5f5f5;color:#1f1f1f;border-color:#f5f5f5;}",
    "#consent-redo{display:block;text-align:center;padding:14px 0;font-size:12px;color:#888;text-decoration:underline;cursor:pointer;}"
  ].join("");
  document.head.appendChild(style);

  function applyChoice(choice) {
    localStorage.setItem(STORAGE_KEY, choice);
    gtag("consent", "update", stateFrom(choice === "granted"));
  }

  function renderRedoLink() {
    if (document.getElementById("consent-redo")) return;
    const link = document.createElement("a");
    link.id = "consent-redo";
    link.href = "#";
    link.textContent = "동의 다시 고르기";
    link.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem(STORAGE_KEY);
      link.remove();
      renderBanner();
    });
    document.body.appendChild(link);
  }

  function renderBanner() {
    if (document.getElementById("consent-banner")) return;
    const banner = document.createElement("div");
    banner.id = "consent-banner";
    banner.innerHTML =
      '<p>더 나은 서비스를 위해 방문 정보를 분석·광고 목적으로 사용해도 될까요?</p>' +
      '<div class="consent-actions">' +
      '<button type="button" id="consent-reject">거부</button>' +
      '<button type="button" id="consent-accept">수락</button>' +
      '</div>';
    document.body.appendChild(banner);

    banner.querySelector("#consent-accept").addEventListener("click", function () {
      applyChoice("granted");
      banner.remove();
      renderRedoLink();
    });
    banner.querySelector("#consent-reject").addEventListener("click", function () {
      applyChoice("denied");
      banner.remove();
      renderRedoLink();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (saved === "granted" || saved === "denied") {
      renderRedoLink();
    } else {
      renderBanner();
    }
  });
})();
