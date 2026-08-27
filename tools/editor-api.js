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

/** ファイルの版。更新時刻とサイズから作る（内容が変われば必ず変わる） */
async function versionOf(file) {
	try {
		const st = await fs.stat(file);
		return `${Math.floor(st.mtimeMs)}-${st.size}`;
	} catch (e) {
		if (e.code === "ENOENT") return "";
		throw e;
	}
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

	// 書き換えは同じサイトからの操作だけ受け付ける。
	// 開発サーバを立てているあいだに別のサイトを開くと、
	// そのページから fetch でここへ書き込まれてしまうため
	// （画像アップロードは CORS の単純リクエストとして素通りする）。
	if (req.method !== "GET") {
		// Host も見る。Origin だけだと、攻撃者のドメインが 127.0.0.1 を
		// 返すよう仕込まれた場合に origin と host が一致して通ってしまう
		const host = String(req.headers.host || "");
		const hostname = host.replace(/:\d+$/, "");
		const allowedHost =
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "::1" ||
			hostname === "[::1]" ||
			/^192\.168\./.test(hostname) ||
			/^10\./.test(hostname) ||
			/^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
		if (!allowedHost) {
			return send(res, 403, {
				error: "このホスト名では書き込みを受け付けません: " + host,
				code: "bad-host",
			});
		}

		const origin = req.headers.origin;
		if (origin) {
			let host = "";
			try {
				host = new URL(origin).host;
			} catch (e) {
				host = "";
			}
			if (host !== req.headers.host) {
				return send(res, 403, {
					error: "別のサイトからの書き込みは受け付けません（origin: " + origin + "）",
					code: "cross-origin",
				});
			}
		}

		// LAN の別端末からの書き換えは端末側に出す。
		// 認証は掛けていないので、身に覚えのないアクセスに気付けるようにしておく
		if (!isLocal(req.socket && req.socket.remoteAddress)) {
			console.log("[editor] " + req.method + " " + p + " ← " + req.socket.remoteAddress);
		}
	}

	handle(req, res, p, url.searchParams).catch((err) => {
		send(res, 400, { error: String(err.message || err) });
	});
};

async function handle(req, res, p, query) {
	// ---- 全データを返す ----
	if (p === "/api/data" && req.method === "GET") {
		const data = {};
		const versions = {};
		for (const file of DATA_FILES) {
			const full = path.join(DATA_DIR, file);
			try {
				data[path.basename(file, ".json")] = JSON.parse(await fs.readFile(full, "utf8"));
				versions[file] = await versionOf(full);
			} catch (e) {
				if (e.code !== "ENOENT") throw e;
			}
		}
		// versions は「この内容を読んだ時点の版」。
		// 保存時に送り返してもらい、その間にファイルが変わっていないか確かめる
		return send(res, 200, { data, versions });
	}

	// ---- 1 ファイル書き換える ----
	if (p.startsWith("/api/data/") && req.method === "PUT") {
		const name = decodeURIComponent(p.slice("/api/data/".length));
		if (!DATA_FILES.includes(name)) throw new Error("書き込めないファイルです: " + name);

		// エディタが読み込んだあとに、別のタブや手作業でファイルが
		// 変わっていないか確かめる。黙って上書きすると変更が消える
		const expected = req.headers["x-expected-version"];
		const destPath = path.join(DATA_DIR, name);
		if (expected) {
			const current = await versionOf(destPath);
			if (current && current !== expected) {
				return send(res, 409, {
					error: name + " は、エディタが読み込んだあとに別の場所で変更されています。"
						+ "上書きすると、そちらの変更が消えます。",
					code: "stale",
					file: name,
				});
			}
		}

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

		return send(res, 200, {
			ok: true,
			file: name,
			bytes: Buffer.byteLength(body),
			version: await versionOf(dest),
		});
	}

	// ---- 画像を保存する ----
	if (p.startsWith("/api/image/") && req.method === "POST") {
		const allowOverwrite = query && query.get("overwrite") === "1";
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

		// 同名ファイルがあるときは黙って潰さない。
		// 別の作品が使っている画像を巻き添えにしないため、
		// 呼び出し側が overwrite=1 を付けて明示したときだけ上書きする
		if (existed && !allowOverwrite) {
			return send(res, 409, {
				error: "同じ名前の画像が既にあります: " + name,
				code: "exists",
				src: "img/" + name,
			});
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
