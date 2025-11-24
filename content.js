// content.js
// 画面操作、CSS注入、設定反映を担当

// --- 設定値 ---
const CONFIG = {
  hideShorts: true,        // Shortsを隠すか
  redirectShorts: true,    // Shortsを開いたら通常プレイヤーに転送するか
  defaultSpeed: 2.0,       // 基本の再生速度
  musicSpeed: 1.0,         // 音楽の時の再生速度
  autoSkipAds: true        // 広告をスキップするか
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
// 2. CSSによる広告・Shortsの徹底排除
// ===========================================================
function injectStyles() {
  if (document.getElementById("confortable-yt-style")) return;

  const targetRoot = document.head || document.documentElement;
  if (!targetRoot) return;

  const style = document.createElement("style");
  style.id = "confortable-yt-style";
  
  // 広告ブロック用の強力なCSSセレクタ群
  const adSelectors = [
    // --- 動画プレーヤー内の広告 ---
    ".ytp-ad-overlay-container",      // 下部バナー広告
    ".ytp-ad-image-overlay",          // 画像オーバーレイ
    "#player-ads",                    // プレーヤー横の広告エリア
    
    // --- ホーム画面・フィード内の広告 (動画紹介に混ざるもの) ---
    "ytd-ad-slot-renderer",           // 汎用広告スロット
    "ytd-rich-item-renderer:has(ytd-ad-slot-renderer)", // 広告を含む動画タイル
    "#masthead-ad",                   // 最上部の巨大バナー
    "ytd-banner-promo-renderer",      // プロモーションバナー
    
    // --- 検索結果・サイドバーの広告 ---
    "ytd-promoted-sparkles-web-renderer", // 検索結果のスポンサーサイト
    "ytd-promoted-sparkles-text-search-renderer",
    "#offer-module",                  // 商品販売など
    
    // --- Shorts関連 (既存) ---
    "ytd-guide-entry-renderer:has(a[href^='/shorts'])",
    "ytd-guide-entry-renderer:has(a[title='Shorts'])",
    "ytd-guide-entry-renderer:has(a[title='ショート'])",
    "ytd-mini-guide-entry-renderer:has(a[href^='/shorts'])",
    "ytd-mini-guide-entry-renderer:has(a[title='Shorts'])",
    "ytd-mini-guide-entry-renderer:has(a[title='ショート'])",
    "ytd-mini-guide-entry-renderer[aria-label='Shorts']",
    "ytd-mini-guide-entry-renderer[aria-label='ショート']",
    "ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])",
    "ytd-reel-shelf-renderer",
    "yt-chip-cloud-chip-renderer:has(span[title='Shorts'])",
    "yt-chip-cloud-chip-renderer:has(span[title='ショート'])",
    "a[href^='/shorts']"
  ];

  style.textContent = `
    ${adSelectors.join(",\n")} {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      width: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  
  targetRoot.appendChild(style);
}


// ===========================================================
// 3. メイン機能 (速度変更・動画広告スキップ)
// ===========================================================

// content_main.js からのカテゴリ情報を受け取る
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "YT_CATEGORY_FETCHED") {
    if (currentCategory !== event.data.category) {
      currentCategory = event.data.category;
      adjustPlaybackSpeed();
    }
  }
});

function adjustPlaybackSpeed() {
  const video = document.querySelector("video");
  if (!video) return;

  // 広告再生中は速度変更ロジックを邪魔しない
  if (document.querySelector(".ad-showing") || document.querySelector(".ad-interrupting")) {
    return;
  }

  const isMusic = currentCategory === "Music" || currentCategory === "音楽";
  const targetSpeed = isMusic ? CONFIG.musicSpeed : CONFIG.defaultSpeed;

  if (Math.abs(video.playbackRate - targetSpeed) > 0.1) {
    video.playbackRate = targetSpeed;
  }
}

function skipAds() {
  if (!CONFIG.autoSkipAds) return;

  const video = document.querySelector("video");
  
  // 1. バナー広告などを物理的に閉じる (CSSで消えていても念のため)
  const overlayCloseBtn = document.querySelector(".ytp-ad-overlay-close-button");
  if (overlayCloseBtn) overlayCloseBtn.click();

  // 2. スキップボタンがあれば即クリック
  const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
  if (skipBtn) {
    skipBtn.click();
    return; 
  }

  // 3. 動画広告が流れている場合 (ad-showingクラスなどで判定)
  const adShowing = document.querySelector(".ad-showing") || document.querySelector(".ad-interrupting");
  if (adShowing && video) {
    // 強制的に超高速再生して終わらせる
    video.playbackRate = 16.0;
    video.muted = true; // 音も消す
    
    // シークが可能なら終了直前まで飛ばす
    if (!isNaN(video.duration) && video.currentTime < video.duration - 0.1) {
       video.currentTime = video.duration;
    }
  }
  
  // 4. アンケート広告など特殊なオーバーレイの除去
  const surveySkip = document.querySelector(".ytp-ad-survey-skip-button"); // アンケートスキップ
  if (surveySkip) surveySkip.click();
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

// 定期実行
setInterval(() => {
  adjustPlaybackSpeed();
  skipAds();
  injectStyles();
}, 500);