// content_main.js
// YouTubeの内部変数(ytInitialPlayerResponseなど)に直接アクセスしてカテゴリを取得する

(function () {
  function sendCategory() {
    try {
      // プレイヤーオブジェクト、または初期データからカテゴリを探す
      const playerResp =
        document.getElementById("movie_player")?.getPlayerResponse?.() ||
        window.ytInitialPlayerResponse;

      const category =
        playerResp?.microformat?.playerMicroformatRenderer?.category;

      if (category) {
        // 拡張機能側のスクリプト(content.js)に送信
        window.postMessage(
          { type: "YT_CATEGORY_FETCHED", category: category },
          "*"
        );
      }
    } catch (e) {
      // エラーは無視（まだロードされていないだけの場合が多い）
    }
  }

  // YouTubeのイベントフック
  window.addEventListener("yt-navigate-finish", sendCategory);
  window.addEventListener("load", sendCategory);

  // SPA遷移対策のポーリング（念のため）
  setInterval(sendCategory, 2000);
})();
