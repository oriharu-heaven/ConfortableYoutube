// content.js
// 画面操作、CSS注入、設定反映を担当

// --- 設定値 ---
const CONFIG = {
  hideShorts: true, // Shortsを隠すか
  redirectShorts: true, // Shortsを開いたら通常プレイヤーに転送するか
  defaultSpeed: 2.0, // 基本の再生速度
  musicSpeed: 1.0, // 音楽の時の再生速度
  autoSkipAds: true, // 広告をスキップするか
};

let currentCategory = null;

// ===========================================================
// 1. Shortsのリダイレクト (最優先・最速で実行)
// ===========================================================
function checkAndRedirectShorts() {
  // URLに /shorts/ が含まれていたら即座に転送
  if (CONFIG.redirectShorts && location.pathname.startsWith("/shorts/")) {
    const videoId = location.pathname.split("/shorts/")[1];
    if (videoId) {
      // 履歴に残さないように replace を使用
      location.replace(`https://www.youtube.com/watch?v=${videoId}`);
    }
  }
}
// 読み込み直後に一度実行
checkAndRedirectShorts();

// ===========================================================
// 2. CSSによるShorts隠蔽 & スタイル適用
// ===========================================================
function injectStyles() {
  // すでにスタイルがあるなら何もしない
  if (document.getElementById("confortable-yt-style")) return;

  // document.head がまだ無い場合は documentElement (htmlタグ) に追記を試みる
  const targetRoot = document.head || document.documentElement;
  if (!targetRoot) return; // それでも無ければ諦めて次のループで実行

  const style = document.createElement("style");
  style.id = "confortable-yt-style";
  style.textContent = `
    /* 左サイドバーのShortsボタン */
    ytd-guide-entry-renderer:has(a[href^="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]) {
      display: none !important;
    }

    /* トップページ・検索結果のShorts棚 */
    ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
    ytd-reel-shelf-renderer {
      display: none !important;
    }

    /* 「ショート」という文字が含まれるヘッダーやタブ（念のため） */
    yt-tab-shape[tab-title="ショート"],
    yt-tab-shape[tab-title="Shorts"] {
      display: none !important;
    }
    
    /* モバイル表示っぽいレイアウトの場合 */
    a[href^="/shorts"] {
      display: none !important;
    }
  `;
  targetRoot.appendChild(style);
  console.log("[Confortable YouTube] Styles injected.");
}

// ===========================================================
// 3. メイン機能 (速度変更・広告スキップ)
// ===========================================================

// content_main.js からのカテゴリ情報を受け取る
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "YT_CATEGORY_FETCHED") {
    if (currentCategory !== event.data.category) {
      currentCategory = event.data.category;
      console.log(`[Confortable YouTube] Category: ${currentCategory}`);
      adjustPlaybackSpeed();
    }
  }
});

function adjustPlaybackSpeed() {
  const video = document.querySelector("video");
  if (!video) return;

  const isMusic = currentCategory === "Music" || currentCategory === "音楽";
  const targetSpeed = isMusic ? CONFIG.musicSpeed : CONFIG.defaultSpeed;

  // 誤差0.1以上あれば変更（微小なズレ防止）
  if (Math.abs(video.playbackRate - targetSpeed) > 0.1) {
    video.playbackRate = targetSpeed;
    // console.log(`Speed updated to ${targetSpeed}`);
  }
}

function skipAds() {
  if (!CONFIG.autoSkipAds) return;

  const skipButton = document.querySelector(
    ".ytp-ad-skip-button, .ytp-ad-skip-button-modern"
  );
  if (skipButton) skipButton.click();

  const overlayCloseBtn = document.querySelector(
    ".ytp-ad-overlay-close-button"
  );
  if (overlayCloseBtn) overlayCloseBtn.click();
}

// ===========================================================
// 4. 監視ループ
// ===========================================================
const observer = new MutationObserver(() => {
  // DOMが変わるたびにチェック
  checkAndRedirectShorts();
  skipAds();
  injectStyles(); // headタグ生成待ちのためここでも呼ぶ
});

// 監視開始 (bodyがあればbody、なければdocumentElement)
const targetNode = document.body || document.documentElement;
observer.observe(targetNode, { childList: true, subtree: true });

// 定期実行 (念押し)
setInterval(() => {
  adjustPlaybackSpeed();
  injectStyles(); // 万が一Observerが外れた時用
}, 1000);
