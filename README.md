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

```bash
npm run check-links   # 外部リンク・埋め込みが生きているか確認
npm run subset-fonts  # アイコンフォントの字形を絞り込む
```

### 外部リンクの確認について

作品の埋め込み（Google ドライブ／スライド／ドキュメント）は、
**元ファイルを消したり「ウェブに公開」を取り下げたりしても、サイト側は何も変わらない。**
中身だけが見られなくなり、こちらからは気づけない。

`npm run check-links` はログインしていない状態でアクセスできるかを調べる。
自分のブラウザで開けても、共有設定が「制限付き」なら訪問者には見えないので、
**シークレットウィンドウで確認するのと同じことを機械的にやる**もの。

- `410` … スライド／ドキュメントの「ウェブに公開」が取り下げられている
- `404` … ファイルが消えている、または共有設定が「制限付き」

### 見られない資料の扱い

大学アカウントの失効により、現在 21 件の埋め込みが到達できない状態にある。
**埋め込みは消していない。**works.json の該当項目に `"unavailable": true` を付けてあり、
印の付いた資料を持つ作品のモーダルには次の一文が出る。

> 大学のアカウントが失効したため、一部の資料は現在ご覧いただけません。復旧を進めています。

復旧したら印を外すだけで、そのまま表示に戻る。手作業でも、まとめてでもよい。

```bash
npm run mark-links   # 実際にアクセスして、印を付け直す（復旧分は自動で外れる）
```

エディタの作品編集画面でも、埋め込みごとに「現在は見られない」を切り替えられる。

---

## 中身を増やす

方法は 2 つある。**フォームで入力するエディタ**（おすすめ）か、JSON を直接書くか。

### エディタを使う

`npm start` を動かした状態で **<http://localhost:8233/tools/editor.html>** を開くだけ。
フォルダを選ぶ操作は要らず、開いた時点でこのプロジェクトのデータを読み込む。

同じ LAN の別端末（ノート PC・スマホ・タブレット）からは
`http://<この PC の IP>:8233/tools/editor.html` で開ける。
ブラウザは何でもよい（Chrome / Firefox / Safari / Edge）。

1. 上のタブで 作品 / 経歴 / About 枠 / SNS / サイト設定 / スキル / 言語 / 実績 を切り替える
2. 「＋ 新しく追加」でひな形が出るので、**「必須」の欄だけ埋めればよい**
3. 「保存」または `Ctrl + S` で `src/_data/*.json` へ書き戻る

**編集を楽にする仕掛け**

- **「任意」の欄は空のままで構わない。** 空欄は JSON に書き出されないので、ファイルは汚れない
- 既にある項目はクリックすればそのまま直せる。`↑` `↓` で並べ替え、「削除」で消せる
- **「複製して追加」** … 似た内容を続けて足すとき、今の項目をコピーして次を作れる（作品の ID は自動で振り直される）
- **絞り込み欄** … 一覧の上の検索欄に打つと、見出しだけでなく**説明文やキーワードの中身も対象に**絞り込める。スキル 24 件から目当ての 1 件を探すときに効く
- **画像は選ぶだけ** … 「画像を選ぶ…」でファイルを指定すると `src/img/` へ送られ、**寸法も自動で埋まる**。作品画像だけでなく、プロフィール画像・首屏の背景画像も同じように差し替えられる
- 埋め込みの ID 欄には共有 URL をそのまま貼ってよい（ID だけ取り出す）
- 必須が埋まっていないと保存を止めるので、書きかけのまま壊れることはない
- 数値の範囲（習熟度 0〜100 など）も保存前に検査する
- 書き込みは一時ファイル経由なので、途中で失敗しても元のファイルは壊れない

**うっかりを防ぐ仕掛け**

- **他所での変更を検知する** … エディタが読み込んだあとに同じファイルが
  別のタブや手作業で変わっていた場合、保存を止めて選ばせる。
  黙って上書きして相手の変更を消すことはない
- **同名画像を勝手に潰さない** … `src/img/` に同じ名前の画像があるときは確認を挟む。
  他の作品が使っている画像を巻き添えにしないため
- **自動リロードを受け取らない** … 保存のたびに開発サーバが全タブへ再読み込みを促すが、
  このページだけはその通知を無視する。編集中の状態が飛ばないようにするため
- **他サイトからの書き込みを拒む** … 開発サーバを立てているあいだに別のサイトを開いても、
  そこからこのリポジトリへ書き込まれないよう Origin と Host を検査する
- **壊れた埋め込みはビルドで止まる** … `media` の `id` / `url` / `label` が欠けていると
  「どの作品の何番目か」を示してビルドが失敗する。気付かないまま公開されない

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

### About の 4 つの枠を編集する

`src/_data/about.json`。氏名・所属・研究・趣味の枠がここに入っている。

```jsonc
{
  "title": "研究",
  "desc": "Real-Time通信, Diffusion model",  // <br /> で改行できる
  "icon": "icon-chemistry",                  // Simple Line Icons のクラス名
  "url": "#works",                           // ページ内なら #id、外部なら https://…
  "external": false                          // 外部リンクなら true（別タブで開く）
}
```

**アニメーションの向きは自動。** 前半が左から、後半が右から入る。枠を増やしても指定不要。

### SNS リンクを編集する

`src/_data/social.json`。フッターのアイコン列。

```jsonc
{ "label": "GitHub", "url": "https://github.com/Gosoki", "icon": "fa-github" }
```

`url` を `mailto:` で始めるとメールリンクになり、別タブ指定も自動で外れる。
表示の遅延も並び順から自動計算される。

### サイト全体の設定・文言

`src/_data/site.json`。エディタの「サイト設定」タブからも編集できる。

ここに入っているもの:

| 項目 | 効くところ |
|---|---|
| `title` / `description` | 検索結果の見出しと説明（SEO） |
| `url` | canonical / OGP / sitemap。**ドメイン変更はここ 1 か所**（あわせて `src/CNAME` も） |
| `hero.name` / `hero.ruby` | 首屏の氏名とふりがな |
| `hero.avatar` / `hero.background` | プロフィール画像と背景画像。**エディタから差し替えられる** |
| `hero.tagline` / `hero.subtitle` | 首屏の見出しと一言 |
| `sections.*` | 各セクションの説明文（About / Career / Skills / 言語 / Works / Contact） |
| `nav` | ヘッダーのメニュー項目 |
| `brand` | ヘッダー左のロゴ文字 |
| `person.*` | 構造化データ用の人物情報（表記ゆれなど） |

---

## 構成

```
src/
├── index.njk              ページ本体（テンプレート）
├── _data/                 ← 内容はすべてここ
│   ├── site.json          サイト情報・ドメイン・各セクションの文言
│   ├── about.json         About の 4 つの枠
│   ├── social.json        フッターの SNS リンク
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
├── sitemap.njk            → /sitemap.xml
├── robots.njk             → /robots.txt
├── 404.njk                → /404.html
└── CNAME                  独自ドメイン設定

tools/editor.html          データ編集エディタ（開発時のみ配信）
tools/editor-api.js        エディタの読み書き API（開発サーバに差し込まれる）
tools/subset-fonts.js      アイコンフォントの字形を絞り込む
tools/fonts-full/          絞り込み前のフォント一式（公開されない）
.eleventy.js               ビルド設定・埋め込み HTML の組み立て
```

見た目を直すときは `src/assets/css/custom.css`。
`style.css` はテンプレート由来なので、原則そちらを上書きする形で当てる。

**`index.njk` に直接書かれた文言はもう無い。** 文章を直したいときは
`src/_data/` の JSON（多くは `site.json`）を見ればよい。

### 画像について

`src/img/` は圧縮済み（GIF は `gifsicle -O3 --lossy=60`、PNG は `pngquant`）。
エディタからアップロードした画像は無加工なので、あとで通しておくと表示が軽くなる。

```bash
gifsicle -O3 --lossy=60 src/img/new.gif -o src/img/new.gif
pngquant --quality=80-95 --force --output src/img/new.png src/img/new.png
```

### アイコンフォントについて

Font Awesome は 593 個、Simple Line Icons は 162 個のアイコンを持つが、
このサイトが使うのは十数個。全部入りを配ると初回表示で 110KB 以上を無駄に読ませるため、
**字形を絞り込んだフォントを置いてある**（合計 13KB）。

絞り込みには「いま使っているもの」に加えて**定番のアイコンを 100 個ほど**含めてあるので、
エディタからアイコンを増やすときも、たいていはそのまま使える。

```bash
node tools/subset-fonts.js --check   # いま何個残す設定かを見る
node tools/subset-fonts.js           # 絞り込みを実行
```

**表示したいアイコンが四角い豆腐になったら**、その字形が絞り込みで落ちている。
`tools/subset-fonts.js` の `HANDY` に名前を足して流し直す。
元の全部入りフォントは `tools/fonts-full/` に置いてある（公開物には含まれない）。

`src/assets/css/animate.css` も同じ理由で、使う 6 種類だけに削ってある（77KB → 4KB）。
新しいアニメーションを使いたくなったら、本家 animate.css から
クラスと `@keyframes`（`-webkit-` 付きも）を持ってくる。

---

## SEO

「呉祖熙」「Go Soki」などで検索に引っかかるようにするための仕掛け。

### 何が入っているか

| 仕掛け | 場所 | 効果 |
|---|---|---|
| `<title>` に人物名 | `site.json` の `title` | 検索結果の見出しになる。重みが最も大きい |
| `description` に表記ゆれ | `site.json` の `description` | 検索結果の説明文。`呉祖熙`（空白なし）もここに含めてある |
| JSON-LD (Person) | `index.njk` の `<script type="application/ld+json">` | 検索エンジンに「この人物 = このページ」と認識させる |
| `sitemap.xml` | `src/sitemap.njk` から生成 | クローラに URL を知らせる |
| `robots.txt` | `src/robots.njk` から生成 | クロールを明示的に許可し、sitemap の場所を示す |

### JSON-LD は自動生成される

構造化データの中身は既存の JSON から組み立てられるので、**SEO のために情報を二重に持たなくてよい**。

- `affiliation`（所属）… `career.json` の `current: true` の項目
- `alumniOf`（出身）… `career.json` のそれ以外
- `knowsAbout`（得意分野）… `skills.json` のうち `percent >= 60` のもの
- `alternateName`（表記ゆれ）… `site.json` の `person.alternateName`

新しい経歴やスキルを足せば構造化データにも自動で反映される。

### 名前の表記ゆれ

検索する人がどう入力するか分からないので、`site.json` の `person.alternateName` に並べてある。

```
呉祖熙 / 呉　祖熙 / Wu Zuxi / Go Soki / Gosoki / ゴ ソキ / ゴソキ / ご そき
```

**ページ見出しは `呉 祖熙`（半角空白入り）だが、空白なしの `呉祖熙` は
description と JSON-LD に入れてある。**新しい表記を足したくなったらここに追記する。

### 検索エンジンへの登録（手作業）

sitemap を置いただけでは早く拾われないので、登録しておくとよい。

1. [Google Search Console](https://search.google.com/search-console) でプロパティを追加
   - ドメイン単位で登録する場合、Cloudflare に TXT レコードを 1 本足して所有権を確認する
2. 「サイトマップ」に `https://gosoki.jp/sitemap.xml` を送信
3. 「URL 検査」で `https://gosoki.jp/` をインデックス登録リクエスト
4. [Bing Webmaster Tools](https://www.bing.com/webmasters) でも同様に登録できる（Search Console から設定を取り込める）

### 被リンクも効く

検索エンジンは外部からのリンクをたどって新しいサイトを見つける。
GitHub のプロフィール欄や他のサイトから `https://gosoki.jp` へリンクを張っておくと拾われやすい。

---

## デプロイ (GitHub Pages)

`.github/workflows/deploy.yml` が `main` への push で自動実行される。

独自ドメインを使うため、DNS 側に以下が必要:

```
# apex は CNAME を使えないので A / AAAA で指す
A     gosoki.jp        185.199.108.153
A     gosoki.jp        185.199.109.153
A     gosoki.jp        185.199.110.153
A     gosoki.jp        185.199.111.153

AAAA  gosoki.jp        2606:50c0:8000::153
AAAA  gosoki.jp        2606:50c0:8001::153
AAAA  gosoki.jp        2606:50c0:8002::153
AAAA  gosoki.jp        2606:50c0:8003::153

# www はサブドメインなので CNAME でよい。IP ではなく github.io を指す
CNAME www.gosoki.jp    gosoki.github.io
```

`src/CNAME` に書いてあるのは apex (`gosoki.jp`) なので、そちらが主ドメインになる。
**`www.gosoki.jp` へのアクセスは GitHub が自動で apex へ 301 リダイレクトする。**
リダイレクトは GitHub のサーバが返すので、www の CNAME レコードも引いておく必要がある
（そうしないとリクエストがそこまで届かない）。証明書は apex と www の両方に発行される。

主ドメインを www 側にしたくなったら `src/CNAME` と `site.json` の `url` を書き換えるだけでよい。
DNS レコードはどちらの向きでも同じ。

DNS が通ったらリポジトリの **Settings → Pages** で **Enforce HTTPS** を有効にする。
IP は GitHub 側の変更があり得るので、設定前に[公式ドキュメント](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)で確認するとよい。

### Cloudflare を挟む場合の注意

`gosoki.jp` は Cloudflare の DNS を使っている。**上のレコードはすべて「DNS only」（灰色の雲）にすること。**

プロキシ（橙色の雲）を有効にすると、Let's Encrypt の HTTP-01 検証が Cloudflare に遮られ、
GitHub が証明書を発行できずに **HTTP 525** になる。

証明書は 90 日ごとに自動更新され、そのたびに同じ検証が走る。
プロキシを有効にしたままだと**数か月後に突然 525 になる**ため、
どうしてもプロキシを使いたい場合は SSL/TLS モードを **Full**（Full strict ではなく）にしておく。

なお GitHub Pages 自体が Fastly の CDN 上にあり、東京にもエッジがある
（実測 TTFB 14ms / X-Served-By: cache-nrt）。速度目的だけなら Cloudflare を挟む必要は薄い。
