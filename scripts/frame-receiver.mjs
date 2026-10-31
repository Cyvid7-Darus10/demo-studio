// Local sink for Chrome screencast frames posted from the Playwright session.
// POST /start?take=<name>  -> creates <rec>/frames/<name>/, resets the index
// POST /frame  {ts, b64}    -> writes fNNNNN.jpg and records its timestamp
// POST /blur   {x,y,w,h,t}  -> appends a post-encode blur box (CSS px, epoch s)
// POST /stop                -> writes ts.txt (timestamps) + end.txt (stop time)
// Run from the recordings dir: node frame-receiver.mjs [recordings-dir]
// Env: DEMO_RX_PORT (default 8765), DEMO_MIN_FREE_GB (default 4)
import { createServer } from "node:http";
import { appendFileSync, mkdirSync, statfsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = join(resolve(process.argv[2] || process.cwd()), "frames");
const port = Number(process.env.DEMO_RX_PORT || 8765);
const minFreeBytes = Number(process.env.DEMO_MIN_FREE_GB || 4) * 1024 ** 3;
const MIN_GAP = 1 / 30; // cap at 30fps; terminals and consoles repaint constantly
const MAX_FRAMES = 5400; // 3 min at 30fps, hard stop per take
mkdirSync(root, { recursive: true });

let dir = null;
let stamps = [];
let lastTs = 0;

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/start") {
      const take = url.searchParams.get("take");
      if (!take || !/^[\w.-]+$/.test(take)) throw new Error("bad take name");
      const free = statfsSync(root);
      if (free.bavail * free.bsize < minFreeBytes) throw new Error("not enough free disk space to record");
      dir = join(root, take);
      mkdirSync(dir, { recursive: true });
      stamps = [];
      lastTs = 0;
    } else if (url.pathname === "/frame") {
      if (!dir) throw new Error("no active take");
      const { ts, b64 } = JSON.parse(await readBody(req));
      if (ts - lastTs < MIN_GAP || stamps.length >= MAX_FRAMES) { res.end("skip"); return; }
      lastTs = ts;
      writeFileSync(join(dir, `f${String(stamps.length).padStart(5, "0")}.jpg`), Buffer.from(b64, "base64"));
      stamps.push(ts);
    } else if (url.pathname === "/blur") {
      if (!dir) throw new Error("no active take");
      appendFileSync(join(dir, "blur.jsonl"), (await readBody(req)).trim() + "\n");
    } else if (url.pathname === "/stop") {
      if (!dir) throw new Error("no active take");
      writeFileSync(join(dir, "ts.txt"), stamps.join("\n") + "\n");
      // screencast only emits on change; the encoder holds the last frame until this time
      writeFileSync(join(dir, "end.txt"), String(Date.now() / 1000));
      res.end(JSON.stringify({ frames: stamps.length, dir }));
      dir = null;
      return;
    }
    res.end("ok");
  } catch (error) {
    console.error(`[frame-receiver] ${req.url}: ${error.message}`);
    res.statusCode = 400;
    res.end(error.message);
  }
}).listen(port, "127.0.0.1", () => console.log(`frame-receiver on 127.0.0.1:${port}, frames in ${root}`));
