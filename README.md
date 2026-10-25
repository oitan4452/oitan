# OITAN — CHARACTER ARCHIVE

代理・OC・プロットキャラクターを掲載する、スマートフォン対応のキャラクターアーカイブです。`index.html` がALL、`proxy.html` が代理、`oc.html` がOC、`plot.html` がプロットキャラクターの一覧ページです。ALL一覧の順番は `characters` の並び順で決まります。

## キャラクターを追加・編集する

GitHub上で `data.js` を開き、鉛筆アイコンから編集します。キャラクター情報は `characters` の配列に追加します。

```js
{ id: "new-character", no: "007", name: "新しい子", kind: "OC", image: "new-character.jpg", summary: "一覧に出す短い紹介", profile: "プロフィール本文", appearancePrompt: "容姿プロンプト", appearanceTags: ["髪型", "目の色"], outfitPrompt: "服装プロンプト", outfitTags: ["衣装"] }
```

- `kind` は `代理` `OC` `プロット` のいずれかです。プロット人物は専用ページに表示され、詳細にはプロット紹介とキャラクタープロフィールだけが表示されます。
- 画像ファイルはリポジトリに `images` フォルダを作って入れ、`image` にファイル名を書きます。画像なしなら頭文字の仮画像を表示します。
- `summary` は一覧カードの短い説明です。空欄ならカード上は省略されます。
- キャラクターカードの「PROMPT +」から専用ページを開きます。`appearancePrompt` と `outfitPrompt` は別々のBOXに表示され、それぞれ個別にコピーできます。項目タグは `appearanceTags` と `outfitTags` に記入します。
- 古いデータの `prompt` と `promptTags` も容姿BOX用として引き続き表示されます。
- `no` は一覧用の番号です。カードの順番は `characters` の並び順になります。

保存時に **Commit changes** を押すと、GitHub Pagesが自動で更新されます。

## 公開について

このリポジトリは公開設定です。サイトに載せるプロフィール、プロンプト、画像は誰でも閲覧できる内容にしてください。
