/* ===========================================================
   주문을 마친 손님에게만 「배송이 출발하면 알려 드릴까요?」 카드를 보여 줍니다.
   쓰는 곳: 주문 완료 화면(done.js) · 상품 상세 「주문했습니다」 아래(products.js)
   알림 허락 창은 「알림 받기」 단추를 누른 처리 안에서만 띄우고,
   granted 가 되면 알림 받을 주소(토큰) 저장은 push-token.js 가 맡습니다.
   =========================================================== */
(function () {
  const BOX_CLASS = "push-prompt";
  const BOX_STYLE = "margin-top:16px;padding:16px;border:1px solid #ddd;border-radius:8px";

  function line(text) {
    const p = document.createElement("p");
    p.className = BOX_CLASS;
    p.style.cssText = "margin-top:16px";
    p.textContent = text;
    return p;
  }

  function status() {
    return "Notification" in window ? Notification.permission : "unsupported";
  }

  // anchor 요소 바로 아래에 카드(또는 안내 한 줄)를 붙인다
  function mount(anchor) {
    if (!anchor) return;
    const old = anchor.parentNode.querySelector("." + BOX_CLASS);
    if (old) old.remove();

    const perm = status();
    if (perm === "unsupported") return;
    if (perm === "granted") { anchor.after(line("알림을 받고 있어요")); return; }
    if (perm === "denied") { anchor.after(line("브라우저 주소창 왼쪽 아이콘 → 알림에서 켤 수 있어요")); return; }

    const card = document.createElement("div");
    card.className = BOX_CLASS;
    card.style.cssText = BOX_STYLE;
    card.innerHTML =
      '<h3 style="margin:0 0 12px">배송이 출발하면 알려 드릴까요?</h3>' +
      '<button class="btn" type="button" data-push="allow">알림 받기</button> ' +
      '<button class="btn ghost" type="button" data-push="later">나중에</button>';

    card.querySelector('[data-push="allow"]').addEventListener("click", function () {
      // 손님이 단추를 누른 이 처리 안에서만 허락 창을 띄운다
      Notification.requestPermission().then(function (result) {
        console.log("알림 허락 결과: " + result);   // granted · denied · default
        if (result === "granted" && window.HaruPushToken) HaruPushToken.register();
        if (result === "granted" || result === "denied") mount(anchor);
      });
    });
    card.querySelector('[data-push="later"]').addEventListener("click", function () {
      card.remove();
    });
    anchor.after(card);
  }

  window.HaruPush = { mount: mount };
})();
