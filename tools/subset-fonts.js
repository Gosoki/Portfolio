#!/usr/bin/env node
/**
 * アイコンフォントの字形を絞り込む。
 *
 * Font Awesome は 593 個、Simple Line Icons は 162 個のアイコンを持つが、
 * このサイトが使うのはごく一部。全部入りのフォントを配ると
 * 初回表示で 110KB 以上を無駄に読ませることになる。
 *
 * ここでは「いま使っているもの」＋「今後足しそうな定番」を残す。
 * 定番まで含めるのは、エディタからアイコンを増やしたときに
 * いちいちこのスクリプトを流し直さなくて済むようにするため。
 *
 *   node tools/subset-fonts.js          絞り込みを実行
 *   node tools/subset-fonts.js --check  いま使っているアイコンが残っているか確認するだけ
 *
 * 元のフォントは tools/fonts-full/ に退避してある。
 * ここに無いアイコンを使いたくなったら、KEEP に足して流し直す。
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FONT_DIR = path.join(ROOT, 'src/assets/fonts');
// 元フォントの退避先。src/ の外に置く。
// src/assets/ 配下だとまるごと公開物へコピーされてしまうため。
const FULL_DIR = path.join(ROOT, 'tools/fonts-full');

// いま使っているもの（テンプレートとデータから自動で拾う分に加え、保険として明示）
const IN_USE = {
	fa: ['angle-down', 'angle-up', 'envelope', 'file-text-o', 'github', 'home',
		'pencil-square-o', 'qq', 'trophy'],
	icon: ['camera', 'chemistry', 'graduation', 'user'],
};

// 今後足しそうな定番。ここにあるものはスクリプトを流し直さずに使える
const HANDY = {
	fa: [
		// SNS
		'twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'weibo', 'wechat',
		'line', 'telegram', 'discord', 'slack', 'medium', 'stack-overflow', 'gitlab',
		'bitbucket', 'dribbble', 'behance', 'twitch', 'rss', 'paper-plane',
		// 連絡・場所
		'phone', 'mobile', 'map-marker', 'globe', 'link', 'external-link', 'at',
		// 学業・仕事
		'university', 'graduation-cap', 'book', 'briefcase', 'flask', 'lightbulb-o',
		'file-pdf-o', 'file-code-o', 'certificate', 'award', 'star', 'star-o',
		// 技術
		'code', 'laptop', 'desktop', 'database', 'server', 'cloud', 'cogs', 'cog',
		'terminal', 'bug', 'cube', 'cubes', 'sitemap', 'wrench', 'microchip',
		// 一般
		'heart', 'heart-o', 'calendar', 'clock-o', 'search', 'tag', 'tags', 'download',
		'play', 'play-circle', 'video-camera', 'picture-o', 'music', 'rocket', 'trophy',
		'check', 'times', 'info-circle', 'question-circle', 'exclamation-triangle',
		'angle-left', 'angle-right', 'arrow-up', 'arrow-down', 'chevron-up', 'chevron-down',
	],
	icon: [
		'people', 'settings', 'note', 'briefcase', 'globe', 'globe-alt', 'screen-desktop',
		'screen-smartphone', 'earphones', 'rocket', 'energy', 'star', 'heart', 'like',
		'magnifier', 'link', 'paper-plane', 'envelope', 'phone', 'location-pin',
		'calendar', 'clock', 'book-open', 'docs', 'layers', 'grid', 'puzzle', 'wrench',
		'speedometer', 'support', 'trophy', 'badge', 'picture', 'camrecorder', 'game-controller',
	],
};

/** CSS から「アイコン名 → 符号位置」の対応表を作る */
function buildTable(cssPath, prefix) {
	const css = fs.readFileSync(cssPath, 'utf8');
	const table = {};
	const re = new RegExp(String.raw`((?:\.${prefix}-[\w-]+:before\s*,?\s*)+)\{\s*content:\s*"\\([0-9a-fA-F]+)"`, 'g');
	let m;
	while ((m = re.exec(css))) {
		const cp = m[2];
		const names = m[1].match(new RegExp(String.raw`\.${prefix}-([\w-]+):before`, 'g')) || [];
		for (const n of names) {
			table[n.replace(new RegExp(String.raw`^\.${prefix}-`), '').replace(':before', '')] = cp;
		}
	}
	return table;
}

const TARGETS = [
	{
		name: 'Font Awesome',
		prefix: 'fa',
		css: path.join(ROOT, 'src/assets/css/font-awesome.min.css'),
		src: 'fontawesome-webfont',
	},
	{
		name: 'Simple Line Icons',
		prefix: 'icon',
		css: path.join(ROOT, 'src/assets/css/simple-line-icons.css'),
		src: 'Simple-Line-Icons',
	},
];

const checkOnly = process.argv.includes('--check');
let failed = false;

for (const t of TARGETS) {
	const table = buildTable(t.css, t.prefix);
	const wanted = [...new Set([...(IN_USE[t.prefix] || []), ...(HANDY[t.prefix] || [])])];
	const resolved = wanted.filter((n) => table[n]);
	const unknown = wanted.filter((n) => !table[n]);

	// 使用中のものが表に無いのは設定ミス
	const missingInUse = (IN_USE[t.prefix] || []).filter((n) => !table[n]);
	if (missingInUse.length) {
		console.error(`  ✗ ${t.name}: 使用中なのに CSS に定義が無い → ${missingInUse.join(', ')}`);
		failed = true;
	}

	const full = path.join(FULL_DIR, `${t.src}.ttf`);
	const source = fs.existsSync(full) ? full : path.join(FONT_DIR, `${t.src}.ttf`);

	if (checkOnly) {
		console.log(`  ${t.name}: 残す予定 ${resolved.length} 個（未定義 ${unknown.length} 個は無視）`);
		continue;
	}

	// 初回だけ元のフォントを退避しておく
	if (!fs.existsSync(FULL_DIR)) fs.mkdirSync(FULL_DIR, { recursive: true });
	for (const ext of ['ttf', 'woff', 'woff2', 'eot', 'svg']) {
		const from = path.join(FONT_DIR, `${t.src}.${ext}`);
		const to = path.join(FULL_DIR, `${t.src}.${ext}`);
		if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
	}

	const unicodes = resolved.map((n) => 'U+' + table[n]).join(',');
	for (const flavor of ['woff2', 'woff']) {
		// pyftsubset は PATH に無いことがあるのでモジュールとして呼ぶ
		execFileSync('python3', [
			'-m', 'fontTools.subset',
			source,
			`--unicodes=${unicodes}`,
			`--flavor=${flavor}`,
			'--layout-features=',
			'--no-hinting',
			'--desubroutinize',
			`--output-file=${path.join(FONT_DIR, `${t.src}.${flavor}`)}`,
		], { stdio: 'pipe' });
	}

	const before = fs.statSync(path.join(FULL_DIR, `${t.src}.woff`)).size;
	const after = fs.statSync(path.join(FONT_DIR, `${t.src}.woff2`)).size;
	console.log(`  ${t.name}: ${resolved.length} 個を保持  woff ${(before / 1024) | 0}KB → woff2 ${(after / 1024) | 0}KB`);
	if (unknown.length) console.log(`     （CSS に定義が無く飛ばした: ${unknown.length} 個）`);
}

process.exit(failed ? 1 : 0);
