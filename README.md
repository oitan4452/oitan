# OITAN — CHARACTER ARCHIVE

スマートフォンでも見やすい、キャラクター・プロット・配布プロンプト用の静的サイトです。GitHub Pagesで公開できます。

## 内容を編集する

1. `data.js` を開き、`characters` / `stories` / `prompts` の中身を書き換えます。
2. キャラクター画像を `images/` に入れ、各キャラクターの `image` にファイル名を記入します。画像がない場合はイニシャル風の仮表示になります。
3. `profile` に紹介文、`prompt` にコピーさせたいプロンプト、`promptTags` に「髪型」「衣装」「構図」などの項目タグを記入します。
4. 物語・プロットの人物は `stories` に追加します。カードの説明には `title`、`summary`、`tags` を使います。

例：

```js
{ id: "new-character", no: "007", name: "新しい子", kind: "OC", image: "new-character.jpg", summary: "短い紹介", profile: "プロフィール", prompt: "copyable prompt", promptTags: ["髪型", "衣装"] }
```

## GitHub Pagesで公開

新しい公開リポジトリを作成し、このフォルダのファイルをリポジトリ直下にアップロードします。GitHubの **Settings → Pages** で `Deploy from a branch`、`main`、`/(root)` を選んで保存します。

公開用リポジトリはソースも公開されます。掲載前に、見せたくない設定やプロンプトが含まれていないか確認してください。
