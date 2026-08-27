#!/usr/bin/env node
/**
 * サイトから外へ出ていくリンクが生きているかを確かめる。
 *
 * 作品の埋め込み（Google ドライブ／スライド／ドキュメント）は、
 * 元ファイルを消したり「ウェブに公開」を取り下げたりすると、
 * サイト側は何も変わらないまま中身だけ見られなくなる。
 * 訪問者に気づかれる前にこちらで気づくためのもの。
 *
 *   node tools/check-links.js          全部調べる
 *   node tools/check-links.js --embeds 作品の埋め込みだけ
 *
 * 判定について:
 *   ここは「ログインしていない人から見えるか」を調べている。
 *   自分のブラウザでは開けても、共有設定が「制限付き」なら
 *   よそから来た人には見えない。そこを拾うのが目的。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'src/_data');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
	+ '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const embedsOnly = process.argv.includes('--embeds');

function read(name) {
	return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'));
}

/** 埋め込み定義から実際に読み込まれる URL を組み立てる */
function embedUrl(m) {
	switch (m.type) {
		case 'drive':
			return `https://drive.google.com/file/d/${m.id}/preview`;
		case 'slides':
			return `https://docs.google.com/presentation/d/e/${m.id}/embed?start=false`;
		case 'doc':
			return `https://docs.google.com/document/d/e/${m.id}/pub?embedded=true`;
		case 'link':
			return m.url;
		default:
			return null;
	}
}

function collect() {
	const targets = [];

	for (const w of read('works.json')) {
		for (const m of w.media || []) {
			const url = embedUrl(m);
			if (url && /^https?:/.test(url)) {
				targets.push({ where: w.id, kind: m.type, url });
			}
		}
	}
	if (embedsOnly) return targets;

	for (const s of read('social.json')) {
		if (/^https?:|^\/\//.test(s.url)) {
			targets.push({ where: 'SNS', kind: s.label, url: s.url.startsWith('//') ? 'https:' + s.url : s.url });
		}
	}
	for (const a of read('about.json')) {
		if (/^https?:|^\/\//.test(a.url)) {
			targets.push({ where: 'About', kind: a.title, url: a.url.startsWith('//') ? 'https:' + a.url : a.url });
		}
	}
	const site = read('site.json');
	const bg = site.hero && site.hero.background;
	if (bg && /^https?:/.test(bg)) {
		targets.push({ where: '首屏', kind: '背景画像', url: bg });
	}
	return targets;
}

async function probe(url) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), 20000);
	try {
		const res = await fetch(url, {
			redirect: 'follow',
			signal: ctrl.signal,
			headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
		});
		// Google は「消えた」を 404、「公開を取り下げた」を 410 で返す
		return { code: res.status, ok: res.ok };
	} catch (e) {
		return { code: 0, ok: false, err: e.name === 'AbortError' ? 'タイムアウト' : e.message };
	} finally {
		clearTimeout(timer);
	}
}

(async function main() {
	const targets = collect();
	console.log(`  ${targets.length} 件を確認します\n`);

	const dead = [];
	// 相手に負荷をかけないよう少しずつ
	for (let i = 0; i < targets.length; i += 4) {
		const batch = targets.slice(i, i + 4);
		const results = await Promise.all(batch.map((t) => probe(t.url)));
		batch.forEach((t, j) => {
			const r = results[j];
			const mark = r.ok ? '✓' : '✗';
			if (!r.ok) dead.push({ ...t, ...r });
			console.log(`  ${mark} ${String(t.where).padEnd(8)} ${String(t.kind).padEnd(8)} `
				+ `${r.ok ? 'HTTP ' + r.code : (r.err || 'HTTP ' + r.code)}  ${t.url.slice(0, 52)}`);
		});
	}

	console.log('');
	if (!dead.length) {
		console.log('  すべて到達できました');
		return;
	}

	console.log(`  ${dead.length} 件が到達できません:\n`);
	for (const d of dead) {
		console.log(`    ${d.where} / ${d.kind}  (${d.err || 'HTTP ' + d.code})`);
		console.log(`      ${d.url}`);
	}
	console.log('');
	console.log('  Google の埋め込みが 404 / 410 のときに考えられること:');
	console.log('    410 … スライドやドキュメントの「ウェブに公開」が取り下げられている');
	console.log('    404 … ファイルが消えている、または共有設定が「制限付き」になっている');
	console.log('  自分のブラウザでは開けても、シークレットウィンドウで開けなければ');
	console.log('  訪問者には見えていません。');
	process.exitCode = 1;
})();
