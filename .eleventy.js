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

	// sitemap.xml の lastmod 用
	eleventyConfig.addGlobalData("buildDate", () => new Date().toISOString().slice(0, 10));

	const DEFAULT_HEIGHT = { drive: 576, slides: 576, doc: 400 };

	// 埋め込み定義（{type, id} など）から iframe の HTML を組み立てる。
	// 作品を追加するときに frameborder や allowfullscreen を書かなくて済むよう、
	// 属性はここで一括して面倒を見る。
	eleventyConfig.addFilter("embedHtml", function (media, workTitle) {
		return (media || [])
			.map((item, index) => {
				const title = `${workTitle}（資料 ${index + 1}）`;
				const height = item.height || DEFAULT_HEIGHT[item.type];

				switch (item.type) {
					case "link":
						return (
							`<div style="margin-bottom: 20px;"><b>${item.label}:</b> ` +
							`<a href="${item.url}" target="_blank" rel="noopener noreferrer">` +
							`${item.text || item.url}</a></div>`
						);
					case "drive":
						return (
							`<iframe src="https://drive.google.com/file/d/${item.id}/preview" ` +
							`height="${height}" allow="autoplay" allowfullscreen title="${title}"></iframe>`
						);
					case "slides":
						return (
							`<iframe src="https://docs.google.com/presentation/d/e/${item.id}` +
							`/embed?start=false&loop=false&delayms=3000" ` +
							`height="${height}" allowfullscreen title="${title}"></iframe>`
						);
					case "doc":
						return (
							`<iframe src="https://docs.google.com/document/d/e/${item.id}/pub?embedded=true" ` +
							`height="${height}" title="${title}"></iframe>`
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
