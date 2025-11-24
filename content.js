// --- 設定値 ---
const CONFIG = {
  hideShorts: true, // Shortsを隠すか
  redirectShorts: true, // Shortsを開いたら通常プレイヤーに転送するか
  defaultSpeed: 2.0, // 基本の再生速度
  musicSpeed: 1.0, // 音楽の時の再生速度
  autoSkipAds: true, // 広告をスキップするか
};

// --- 変数: 現在の動画カテゴリ ---
let currentCategory = null;

// ===========================================================
// 1. 内部データ取得用スクリプトの注入 (Main World Injection)
// ===========================================================
// YouTubeのページ内部にある変数を取得して、この拡張機能に送信させる
const injectScript = document.createElement("script");
injectScript.textContent = `
  (function() {
    // カテゴリ情報を拡張機能へ送信する関数
    function sendCategory() {
      try {
        const playerResp = document.getElementById('movie_player')?.getPlayerResponse?.() 
                           || window.ytInitialPlayerResponse;
        
        const category = playerResp?.microformat?.playerMicroformatRenderer?.category;
        
        window.postMessage({ type: 'YT_CATEGORY_FETCHED', category: category }, '*');
      } catch (e) {
        // まだロードされていない可能性があるので無視
      }
    }

    // ページ遷移(SPA)やロード完了を検知して実行
    window.addEventListener('yt-navigate-finish', sendCategory);
    window.addEventListener('load', sendCategory);
    
    // 念のため定期実行（プレイヤーの準備が遅れることがあるため）
    setInterval(sendCategory, 2000);
  })();
`;
document.documentElement.appendChild(injectScript);
injectScript.remove();

// 内部スクリプトからのメッセージを受け取る
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "YT_CATEGORY_FETCHED") {
    // カテゴリが変わった場合のみ更新処理
    if (currentCategory !== event.data.category) {
      currentCategory = event.data.category;
      console.log(
        `[Confortable YouTube] Category Detected: ${currentCategory}`
      );
      adjustPlaybackSpeed();
    }
  }
});

// ===========================================================
// 2. Shortsの無効化とスタイル制御
// ===========================================================

// Shortsのリダイレクト処理 (ページ読み込みの最初の方で実行)
function checkAndRedirectShorts() {
  if (
    CONFIG.redirectShorts &&
    window.location.pathname.startsWith("/shorts/")
  ) {
    const videoId = window.location.pathname.split("/shorts/")[1];
    if (videoId) {
      // 通常のプレイヤーへ転送
      window.location.replace(`https://www.youtube.com/watch?v=${videoId}`);
    }
  }
}
checkAndRedirectShorts(); // 初回実行

// CSSによるShorts要素の隠蔽
if (CONFIG.hideShorts) {
  const style = document.createElement("style");
  style.textContent = `
    /* 左メニューのShortsボタン (href属性で判定するので確実) */
    ytd-guide-entry-renderer:has(a[href^="/shorts"]),
    ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]) {
      display: none !important;
    }

    /* トップページや検索結果のShorts棚 */
    ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
    ytd-reel-shelf-renderer {
      display: none !important;
    }
    
    /* スマホ版レイアウトなどが混ざった場合のShortsリンク */
    a[href^="/shorts"] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

// ===========================================================
// 3. 広告スキップ & 再生速度変更
// ===========================================================

function adjustPlaybackSpeed() {
  const video = document.querySelector("video");
  if (!video) return;

  // カテゴリ判定 (取得できていない場合は一旦デフォルトにする)
  // "Music" (英語設定) または "音楽" (日本語設定) の場合に等倍
  const isMusic = currentCategory === "Music" || currentCategory === "音楽";

  const targetSpeed = isMusic ? CONFIG.musicSpeed : CONFIG.defaultSpeed;

  // 速度適用 (再生中かつ速度が違う場合のみ)
  if (Math.abs(video.playbackRate - targetSpeed) > 0.1) {
    video.playbackRate = targetSpeed;
    console.log(
      `[Confortable YouTube] Speed set to ${targetSpeed}x (Category: ${currentCategory})`
    );
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
// 4. 監視ループ (Observer)
// ===========================================================

// URL変更監視 (SPA対応)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    checkAndRedirectShorts(); // URLが変わったら即Shortsチェック
    currentCategory = null; // カテゴリリセット
  }
  skipAds(); // 広告は常に監視
}).observe(document, { subtree: true, childList: true });

// 定期チェック (念のため)
setInterval(() => {
  adjustPlaybackSpeed();
}, 1000);

console.log("[Confortable YouTube] Loaded.");
