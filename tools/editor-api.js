/**
 * データエディタ用の読み書き API。
 *
 * 11ty の開発サーバ (npm start) にミドルウェアとして差し込む。
 * 本番ビルドでは読み込まれない（.eleventy.js 側で分岐している）。
 *
 *   GET  /api/data              … _data/*.json をまとめて返す
 *   PUT  /api/data/<file>.json  … 1 ファイル書き換える
 *   POST /api/image/<name>      … src/img/ へ画像を保存する
 *
 * 書き込み先は _data の決まった 5 ファイルと src/img/ だけに限定してある。
 */

const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "src", "_data");
const IMG_DIR = path.join(ROOT, "src", "img");

const DATA_FILES = [
	"works.json",
	"career.json",
	"skills.json",
	"languages.json",
	"achievements.json",
	"about.json",
	"social.json",
	"site.json",
];
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const MAX_BODY = 32 * 1024 * 1024; // 32 MB

function send(res, code, body, type) {
	const buf = Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
	res.writeHead(code, {
		"Content-Type": type || "application/json; charset=utf-8",
		"Content-Length": buf.length,
		"Cache-Control": "no-store",
	});
	res.end(buf);
}

async function readBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > MAX_BODY) throw new Error("送信サイズが大きすぎます（上限 32 MB）");
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

/** ディレクトリ外へ出ないことを確かめてから絶対パスを返す */
function safeJoin(dir, name) {
	const full = path.resolve(dir, name);
	if (full !== path.join(dir, path.basename(name))) {
		throw new Error("不正なファイル名です: " + name);
	}
	return full;
}

/** 127.0.0.1 / ::1 からのアクセスか */
function isLocal(addr) {
	if (!addr) return false;
	const a = String(addr).replace(/^::ffff:/, "");
	return a === "127.0.0.1" || a === "::1" || a === "localhost";
}

module.exports = function editorApi(req, res, next) {
	const url = new URL(req.url, "http://localhost");
	const p = url.pathname;

	if (!p.startsWith("/api/")) return next();

	// LAN の別端末から書き換えが来たら端末側に出す。
	// 認証は掛けていないので、身に覚えのないアクセスに気付けるようにしておく。
	if (req.method !== "GET" && !isLocal(req.socket && req.socket.remoteAddress)) {
		console.log("[editor] " + req.method + " " + p + " ← " + req.socket.remoteAddress);
	}

	handle(req, res, p).catch((err) => {
		send(res, 400, { error: String(err.message || err) });
	});
};

async function handle(req, res, p) {
	// ---- 全データを返す ----
	if (p === "/api/data" && req.method === "GET") {
		const out = {};
		for (const file of DATA_FILES) {
			try {
				out[path.basename(file, ".json")] = JSON.parse(
					await fs.readFile(path.join(DATA_DIR, file), "utf8")
				);
			} catch (e) {
				if (e.code !== "ENOENT") throw e;
			}
		}
		return send(res, 200, out);
	}

	// ---- 1 ファイル書き換える ----
	if (p.startsWith("/api/data/") && req.method === "PUT") {
		const name = decodeURIComponent(p.slice("/api/data/".length));
		if (!DATA_FILES.includes(name)) throw new Error("書き込めないファイルです: " + name);

		const text = (await readBody(req)).toString("utf8");
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch (e) {
			throw new Error("JSON として読めません: " + e.message);
		}

		// 書き込む前に必ず整形し直す（壊れた内容がそのまま入らないように）
		const body = JSON.stringify(parsed, null, 2) + "\n";
		const dest = safeJoin(DATA_DIR, name);

		// 一時ファイルへ書いてから置き換える（途中で落ちても元が残る）
		const tmp = dest + ".tmp";
		await fs.writeFile(tmp, body, "utf8");
		await fs.rename(tmp, dest);

		return send(res, 200, { ok: true, file: name, bytes: Buffer.byteLength(body) });
	}

	// ---- 画像を保存する ----
	if (p.startsWith("/api/image/") && req.method === "POST") {
		const raw = decodeURIComponent(p.slice("/api/image/".length));
		const name = path.basename(raw);
		const ext = path.extname(name).toLowerCase();

		// 黙って直すのではなく、素直でない名前はその場で断る
		if (!name || name !== raw || name.startsWith(".")) {
			throw new Error("ファイル名が不正です: " + raw);
		}
		if (!IMAGE_EXT.has(ext)) {
			throw new Error("対応していない拡張子です: " + (ext || "(なし)"));
		}

		const buf = await readBody(req);
		if (!buf.length) throw new Error("中身が空です");

		const dest = safeJoin(IMG_DIR, name);
		let existed = true;
		try {
			await fs.access(dest);
		} catch (e) {
			existed = false;
		}

		await fs.mkdir(IMG_DIR, { recursive: true });
		await fs.writeFile(dest, buf);
		return send(res, 200, { ok: true, src: "img/" + name, bytes: buf.length, overwritten: existed });
	}

	// ---- 既にある画像の一覧（ファイル名を選ぶとき用）----
	if (p === "/api/images" && req.method === "GET") {
		let names = [];
		try {
			names = (await fs.readdir(IMG_DIR))
				.filter((n) => IMAGE_EXT.has(path.extname(n).toLowerCase()))
				.sort();
		} catch (e) {
			if (e.code !== "ENOENT") throw e;
		}
		return send(res, 200, { images: names });
	}

	send(res, 404, { error: "そのような API はありません: " + req.method + " " + p });
}
