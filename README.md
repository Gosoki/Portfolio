# Gosoki's Portfolio

[Eleventy (11ty)](https://www.11ty.dev/) で組んだ静的サイト。
ページの中身は `src/_data/*.json` に集約してあるので、**HTML を触らずに項目を増やせる**。

公開先: <https://gosoki.jp>

---

## 開発

```bash
npm install      # 初回のみ
npm start        # http://localhost:8233 でプレビュー（保存すると自動再読み込み）
npm run build    # _site/ に書き出す
```

`main` に push すると GitHub Actions が自動でビルドして Pages へ公開する。
手元でビルドしたものを上げる必要はない。

---

## 中身を増やす

方法は 2 つある。**フォームで入力するエディタ**（おすすめ）か、JSON を直接書くか。

### エディタを使う

`npm start` を動かした状態で **<http://localhost:8233/tools/editor.html>** を開くだけ。
フォルダを選ぶ操作は要らず、開いた時点でこのプロジェクトのデータを読み込む。

同じ LAN の別端末（ノート PC・スマホ・タブレット）からは
`http://<この PC の IP>:8233/tools/editor.html` で開ける。
ブラウザは何でもよい（Chrome / Firefox / Safari / Edge）。

1. 上のタブで 作品 / 経歴 / スキル / 言語 / 実績 を切り替える
2. 「＋ 新しく追加」でひな形が出るので、**「必須」の欄だけ埋めればよい**
3. 「保存」または `Ctrl + S` で `src/_data/*.json` へ書き戻る

- **「任意」の欄は空のままで構わない。** 空欄は JSON に書き出されないので、ファイルは汚れない
- 既にある項目はクリックすればそのまま直せる。`↑` `↓` で並べ替え、「削除」で消せる
- 作品の画像は「画像ファイルを選ぶ…」から選ぶと、`src/img/` へ送られ**寸法も自動で埋まる**
- 埋め込みの ID 欄には共有 URL をそのまま貼ってよい（ID だけ取り出す）
- 必須が埋まっていないと保存を止めるので、書きかけのまま壊れることはない
- 書き込みは一時ファイル経由なので、途中で失敗しても元のファイルは壊れない

#### 公開サイトには影響しない

エディタ本体 (`tools/`) と読み書き API は **`npm start` の開発サーバにしか存在しない**。
GitHub Actions のビルドは `ELEVENTY_ENV=production` で走るため、
`tools/` は成果物に含まれず、API も生えない。
そもそも GitHub Pages は静的ホスティングなので、サーバ側の処理は動かない。
**公開したサイトを他人が書き換えることはできない。**

#### ただし LAN 内には無防備

`npm start` を動かしている間、**同じネットワークにいる人は誰でも**
`http://<IP>:8233/tools/editor.html` を開いてデータを書き換えられる（認証は無い）。

自宅の回線なら気にしなくてよいが、学校・職場・カフェなどの共有 Wi-Fi では注意すること。
LAN の別端末から書き込みがあった場合は、`npm start` を動かしている端末の画面に
`[editor] PUT /api/data/... ← 192.168.x.x` のように出る。

### JSON を直接書く

編集するのは `src/_data/` の中の JSON だけ。

### 作品を足す

1. 画像を `src/img/` に置く（横 550px 前後、`.jpg` / `.gif`）
2. `src/_data/works.json` の配列に 1 件足す

```jsonc
{
  "id": "work13",                    // 他と重複しない任意の ID
  "featured": true,                  // false にすると More Works の中に隠れる
  "card": {
    "title": "地震可視化",            // カードに出る短いタイトル
    "text": "地震を可視化するプログラム" // カードの一行説明（<br /> 可）
  },
  "images": [
    { "src": "img/work13.gif", "alt": "動作画面", "width": 550, "height": 310 }
  ],
  "title": "地震可視化プログラム",      // モーダルの見出し
  "keywords": ["Python", "Processing"],
  "description": "モーダルに出る詳しい説明。",
  "media": [
    { "type": "drive",  "id": "1vq7bUfrHUa5AmWhWucqG0xiS6KuBnbcL" },
    { "type": "slides", "id": "2PACX-1vQRXYBx1NjM0vkJg9M7z9jbHFiLxZ7pj1zdPCG" },
    { "type": "doc",    "id": "2PACX-1vQnDVJNZdfxq1Eo_zItylFgw-_tgZ8yVugIsK" },
    { "type": "link",   "label": "Demo", "url": "https://example.com" }
  ]
}
```

**並び順は気にしなくてよい。** `featured: true` が先、`false` が後ろに自動で並ぶ。

**`images` を 2 枚以上入れると自動でスライドショーになる**（work5 と同じ挙動）。

#### `media` の書き方

`iframe` のタグは書かない。種類と ID だけ書けば、属性はテンプレートが付ける。

| type | 何を埋め込むか | `id` に入れるもの |
|---|---|---|
| `drive` | Google Drive の動画 | 共有リンク `.../file/d/**1ABC...**/view` の太字部分 |
| `slides` | Google スライド | 「ウェブに公開」の埋め込み URL `.../d/e/**2PACX-...**/embed?...` の太字部分 |
| `doc` | Google ドキュメント | 「ウェブに公開」の URL `.../d/e/**2PACX-...**/pub?...` の太字部分 |
| `link` | ただのリンク | `id` ではなく `label` と `url`（表示文字を変えたいときは `text` も） |

高さは `drive` / `slides` が 576px、`doc` が 400px。変えたいときだけ `"height": 480` を足す。

### 経歴を足す（Career の横タイムライン）

`src/_data/career.json`。**ノード 1 つが「一続きの経歴」**で、日付は期間で書く。

```jsonc
{
  "start": "2021.4",
  "end": "2025.3",              // 省くと期間の終わりを表示しない
  "title": "武蔵野大学",
  "detail": "データサイエンス学部",  // 任意
  "current": true               // 任意。丸を塗りつぶし「現在」バッジを付ける
}
```

- 横に並ぶので、**4〜6 件くらいが見やすい**。増えるほど 1 件あたりの幅が狭くなる
- 入学と卒業を別々のノードにせず、1 件にまとめて `start` 〜 `end` で表すと収まりが良い
- **768px 以下では自動で縦並びに切り替わる**（CSS 側で処理。何も指定しなくてよい）
- フェードインの遅延は並び順から自動で決まる

### スキルを足す

`src/_data/skills.json` に 1 行足すだけ。並び順がそのまま表示順になる。

```jsonc
{ "name": "Rust", "percent": 40, "detail": "基本構文、CLI ツール作成" }
```

`percent` が 60 未満だとバーが自動でオレンジになる。
ヒントの赤い点は先頭の項目に自動で付く。

### 言語を足す

`src/_data/languages.json`。円グラフの数字と `percent` は連動する。

```jsonc
{ "name": "韓国語", "percent": 40, "detail": "日常会話レベル" }
```

### 経歴（タイムライン）を足す

`src/_data/achievements.json` は 2 列構成。該当する列の `items` に足す。

```jsonc
{ "year": "2026.3", "title": "修士論文", "venue": "研究題目", "desc": "所属・発表先" }
```

**アニメーションの向きと遅延は自動。** 左列は左から、右列は右からフェードインし、
2 件目以降には 0.2 秒の遅延が付く。手で指定する必要はない。

新しい列を増やしたい場合は配列にオブジェクトを足す（`icon` は Font Awesome のクラス名）。

### サイト全体の情報

`src/_data/site.json` にタイトル・説明文・ドメインをまとめてある。
**ドメインを変えるときはここ 1 か所**（canonical / OGP / favicon が連動する）。
あわせて `src/CNAME` も書き換えること。

---

## 構成

```
src/
├── index.njk              ページ本体（テンプレート）
├── _data/                 ← 内容はすべてここ
│   ├── site.json          サイト情報・ドメイン
│   ├── career.json        経歴（Career の横タイムライン）
│   ├── skills.json        スキル 24 件
│   ├── languages.json     言語 4 件
│   ├── achievements.json  経歴 2 列 × 3 件
│   └── works.json         作品 12 件
├── assets/
│   ├── css/style.css      テンプレート由来のスタイル
│   ├── css/custom.css     ← 見た目の調整はこちら
│   └── js/custom.js       固定ヘッダー・首屏の高さ
├── img/                   作品画像
└── CNAME                  独自ドメイン設定

tools/editor.html          データ編集エディタ（開発時のみ配信）
.eleventy.js               ビルド設定・埋め込み HTML の組み立て
```

見た目を直すときは `src/assets/css/custom.css`。
`style.css` はテンプレート由来なので、原則そちらを上書きする形で当てる。

---

## デプロイ (GitHub Pages)

`.github/workflows/deploy.yml` が `main` への push で自動実行される。

独自ドメインを使うため、DNS 側に以下が必要:

```
A     gosoki.jp    185.199.108.153
A     gosoki.jp    185.199.109.153
A     gosoki.jp    185.199.110.153
A     gosoki.jp    185.199.111.153

AAAA  gosoki.jp    2606:50c0:8000::153
AAAA  gosoki.jp    2606:50c0:8001::153
AAAA  gosoki.jp    2606:50c0:8002::153
AAAA  gosoki.jp    2606:50c0:8003::153

CNAME www.gosoki.jp → gosoki.github.io   （任意。www を apex へ寄せる）
```

DNS が通ったらリポジトリの **Settings → Pages** で **Enforce HTTPS** を有効にする。
IP は GitHub 側の変更があり得るので、設定前に[公式ドキュメント](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)で確認するとよい。
