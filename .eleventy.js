module.exports = function (eleventyConfig) {

	// CSS / JS / フォント / 画像はそのままコピーする
	eleventyConfig.addPassthroughCopy("src/assets");
	eleventyConfig.addPassthroughCopy("src/img");
	eleventyConfig.addPassthroughCopy("src/CNAME");
	eleventyConfig.addPassthroughCopy("src/.nojekyll");

	// データ編集用のエディタ。開発時だけ配信し、本番ビルドには含めない。
	// GitHub Pages は静的ホスティングなので、仮に配信されても API は動かない。
	const devMode = process.env.ELEVENTY_ENV !== "production";

	if (devMode) {
		eleventyConfig.addPassthroughCopy({ tools: "tools" });
	}

	// npm start のプレビュー設定
	eleventyConfig.setServerOptions({
		port: 8233,
		// 同じ LAN の別端末（スマホ・別の PC）からも開けるようにする
		showAllHosts: true,
		// エディタの読み書き API。開発サーバにだけ生える
		middleware: devMode ? [require("./tools/editor-api.js")] : []
	});

	// 常時表示の作品を先に、折りたたみ（featured: false）を後ろにまとめる。
	// これで works.json への追記順を気にしなくてよくなる。
	eleventyConfig.addFilter("byFeatured", (works) => [
		...works.filter((w) => w.featured !== false),
		...works.filter((w) => w.featured === false),
	]);

	// ---- 構造化データ (JSON-LD) 用のヘルパ ----
	// 経歴とスキルは既存の JSON から拾うので、SEO のために二重管理しなくてよい

	// 一定以上の習熟度のスキル名だけを取り出す
	eleventyConfig.addFilter("skillNames", (skills, min) =>
		(skills || []).filter((s) => (s.percent || 0) >= (min || 60)).map((s) => s.name)
	);

	// career.json から所属（current: true）／出身（それ以外）を組み立てる
	eleventyConfig.addFilter("orgList", (career, wantCurrent) =>
		(career || [])
			.filter((w) => Boolean(w.current) === Boolean(wantCurrent))
			.map((w) => ({
				"@type": "EducationalOrganization",
				name: [w.title, w.detail].filter(Boolean).join(" "),
			}))
	);

	// <script> の中へ値を埋めるための JSON 化。
	// nunjucks 標準の dump には次の穴があり、そのまま使うとページが壊れる:
	//   1) undefined を空文字にするので `keywords: ,` のような構文エラーになる
	//      （任意項目を空にして保存するとキーごと消えるため、実際に起きる）
	//   2) </script> をエスケープしないので、文字列の中身で script が閉じてしまう
	//   3) U+2028 / U+2029 は JS では行終端子として扱われ、構文エラーになる
	eleventyConfig.addFilter("jsonSafe", function (value, fallback) {
		const v = value === undefined || value === null
			? (fallback === undefined ? null : fallback)
			: value;
		return JSON.stringify(v)
			.replace(/</g, "\\u003c")
			.replace(/>/g, "\\u003e")
			.replace(/\u2028/g, "\\u2028")
			.replace(/\u2029/g, "\\u2029");
	});

	// 別タブで開くべきリンクか。
	// url が無い項目でもビルドが落ちないよう、ここで型ごと吸収する
	eleventyConfig.addFilter("isExternalLink", function (url) {
		if (typeof url !== "string" || !url) return false;
		if (url.startsWith("mailto:") || url.startsWith("tel:")) return false;
		if (url.startsWith("#") || url.startsWith("/")) return false;
		return true;
	});

	// sitemap.xml の lastmod 用
	eleventyConfig.addGlobalData("buildDate", () => new Date().toISOString().slice(0, 10));

	const DEFAULT_HEIGHT = { drive: 576, slides: 576, doc: 400 };

	// 埋め込み定義（{type, id} など）から iframe の HTML を組み立てる。
	// 作品を追加するときに frameborder や allowfullscreen を書かなくて済むよう、
	// 属性はここで一括して面倒を見る。
	// HTML の属性値へ安全に入れるためのエスケープ
	const attr = (v) =>
		String(v == null ? "" : v)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");

	// 埋め込みを組み立てる。
	// src ではなく data-src に入れておき、モーダルを開いた時点で JS が差し込む。
	// こうしないと、隠してあるだけの 12 作品ぶんの iframe を
	// ページを開いた瞬間に全部読みに行ってしまう。
	eleventyConfig.addFilter("embedHtml", function (media, workTitle) {
		return (media || [])
			.map((item, index) => {
				const where = `works.json の「${workTitle}」の ${index + 1} 番目の埋め込み`;

				// 値が欠けたまま通すと .../file/d//preview のような
				// 壊れた埋め込みが黙って本番に出る。ここで止める
				if (item.type === "link") {
					if (!item.url) throw new Error(`${where}: link には url が要ります`);
					if (!item.label) throw new Error(`${where}: link には label が要ります`);
				} else if (!item.id) {
					throw new Error(`${where}: ${item.type} には id が要ります`);
				}

				const title = attr(`${workTitle}（資料 ${index + 1}）`);
				const height = item.height || DEFAULT_HEIGHT[item.type];
				const id = attr(item.id);

				switch (item.type) {
					case "link":
						return (
							`<div class="work-link-row"><b>${attr(item.label)}:</b> ` +
							`<a href="${attr(item.url)}" target="_blank" rel="noopener noreferrer">` +
							`${attr(item.text || item.url)}</a></div>`
						);
					case "drive":
						return (
							`<iframe data-src="https://drive.google.com/file/d/${id}/preview" ` +
							`height="${height}" allow="autoplay" allowfullscreen loading="lazy" title="${title}"></iframe>`
						);
					case "slides":
						return (
							`<iframe data-src="https://docs.google.com/presentation/d/e/${id}` +
							`/embed?start=false&amp;loop=false&amp;delayms=3000" ` +
							`height="${height}" allowfullscreen loading="lazy" title="${title}"></iframe>`
						);
					case "doc":
						return (
							`<iframe data-src="https://docs.google.com/document/d/e/${id}/pub?embedded=true" ` +
							`height="${height}" loading="lazy" title="${title}"></iframe>`
						);
					default:
						throw new Error(
							`works.json: 未対応の media type "${item.type}"（link / drive / slides / doc のいずれか）`
						);
				}
			})
			.join("");
	});

	return {
		dir: {
			input: "src",
			output: "_site",
			data: "_data"
		},
		htmlTemplateEngine: "njk",
		markdownTemplateEngine: "njk"
	};
};
