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
  if (CONFIG.redirectShorts && location.pathname.startsWith("/shorts/")) {
    const videoId = location.pathname.split("/shorts/")[1];
    if (videoId) {
      location.replace(`https://www.youtube.com/watch?v=${videoId}`);
    }
  }
}
checkAndRedirectShorts();

// ===========================================================
// 2. CSSによるShorts隠蔽 & スタイル適用 (強化版)
// ===========================================================
function injectStyles() {
  if (document.getElementById("confortable-yt-style")) return;

  const targetRoot = document.head || document.documentElement;
  if (!targetRoot) return;

  const style = document.createElement("style");
  style.id = "confortable-yt-style";
  style.textContent = `
    /* --- 左サイドバーメニュー (日本語・英語対応) --- */
    /* 通常メニュー (開いている時) */
    ytd-guide-entry-renderer:has(a[href^="/shorts"]),
    ytd-guide-entry-renderer:has(a[title="Shorts"]),
    ytd-guide-entry-renderer:has(a[title="ショート"]),
    /* ミニメニュー (閉じている時) */
    ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[title="Shorts"]),
    ytd-mini-guide-entry-renderer:has(a[title="ショート"]),
    /* スマホ/タブレット表示時 */
    ytd-mini-guide-entry-renderer[aria-label="Shorts"],
    ytd-mini-guide-entry-renderer[aria-label="ショート"] {
      display: none !important;
    }

    /* --- トップページ・検索結果のShorts棚 --- */
    ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
    ytd-reel-shelf-renderer {
      display: none !important;
    }
    
    /* --- その他「ショート」へのリンク --- */
    /* チップ（ヘッダー下のフィルタボタン） */
    yt-chip-cloud-chip-renderer:has(span[title="Shorts"]),
    yt-chip-cloud-chip-renderer:has(span[title="ショート"]) {
      display: none !important;
    }
  `;
  targetRoot.appendChild(style);
  console.log("[Confortable YouTube] Styles injected (Enhanced).");
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

  if (Math.abs(video.playbackRate - targetSpeed) > 0.1) {
    video.playbackRate = targetSpeed;
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
  checkAndRedirectShorts();
  skipAds();
  injectStyles();
});

const targetNode = document.body || document.documentElement;
observer.observe(targetNode, { childList: true, subtree: true });

setInterval(() => {
  adjustPlaybackSpeed();
  injectStyles();
}, 1000);
