// Render a composition in chunks, each in its own Remotion process, so memory is fully released between chunks
// (one long render of a 3D scene can run this PC out of memory). Then join the chunks losslessly (ffmpeg concat,
// stream copy: no re-encoding) and add the audio track.
//
//   node tools/render-chunks.mjs <CompositionId> <out.mp4> [--chunk 600] [--audio public/audio/x.wav] [--dir out/chunks/x] [--keep]
//
// - chunks: frames 0-599, 600-1199, ... to the last frame; each one H.264 CRF 16, muted, into out/chunks/<id>/
// - resumable: a chunk that already exists with the right number of frames is not rendered again
// - audio: the given file is encoded once (AAC 192k) into the final file; without --audio the video has no sound
// - --keep keeps the chunk files (by default they are deleted after the final file checks out)
// Uses only what the project already has (Node, Remotion's own ffmpeg / ffprobe): nothing to install.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const VALUED = ["--chunk", "--audio", "--dir", "--max"];
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const [id, outFile] = args.filter((a, i) => !a.startsWith("--") && !VALUED.includes(args[i - 1]));
if (!id || !outFile) { console.error("usage: node tools/render-chunks.mjs <CompositionId> <out.mp4> [--chunk 600] [--audio file.wav] [--keep]"); process.exit(1); }
const CHUNK = Number(opt("--chunk", 600)), AUDIO = opt("--audio", null), KEEP = args.includes("--keep"), MAX = Number(opt("--max", 1e9));   // --max n: render at most n chunks this run, then exit 3 (run again to continue)
const shell = process.platform === "win32";
const run = (cmd, a, quiet = false) => {
  const r = spawnSync(cmd, a, { stdio: quiet ? "pipe" : "inherit", shell, encoding: "utf8" });
  if (r.status !== 0) { if (quiet) process.stderr.write((r.stdout || "") + (r.stderr || "")); throw new Error(`${cmd} ${a.join(" ")} failed (${r.status})`); }
  return r.stdout || "";
};
const frameCount = (file) => Number(run("npx", ["remotion", "ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
  "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", `"${file}"`], true).trim().split(/[,\s]/)[0]); // ffprobe prints e.g. "600,"

// how many frames the composition has: the listing reads "<id>  <fps>  <w>x<h>  <frames> (<seconds> sec)"
const ESC = String.fromCharCode(27);
const list = run("npx", ["remotion", "compositions", "src/index.ts"], true).split(ESC).map((p, i) => (i ? p.replace(/^\[[0-9;]*m/, "") : p)).join("");
const row = list.split(/\r?\n/).map((l) => l.trim().match(/^(\S+)\s+(\d+)\s+(\d+)x(\d+)\s+(\d+)/)).find((m) => m && m[1] === id);
if (!row) { console.error(`could not find composition "${id}" in:\n${list}`); process.exit(1); }
const frames = Number(row[5]);

const dir = opt("--dir", null) ? resolve(opt("--dir", null)) : resolve("out", "chunks", id);   // --dir: where the chunks go (default out/chunks/<id>)
mkdirSync(dir, { recursive: true });
const parts = [];
let rendered = 0;
for (let a = 0, k = 0; a < frames; a += CHUNK, k++) {
  const b = Math.min(frames - 1, a + CHUNK - 1), file = join(dir, `part_${String(k).padStart(2, "0")}.mp4`);
  parts.push(file);
  // a chunk left half-written by a crash cannot be probed: treat it as missing, delete it and render it again
  const have = (() => { if (!existsSync(file)) return -1; try { return frameCount(file); } catch { return -1; } })();
  if (have === b - a + 1) { console.log(`chunk ${k}: frames ${a}-${b} already rendered, skipped`); continue; }
  if (existsSync(file)) { console.log(`chunk ${k}: incomplete file (${have} frames), rendering it again`); rmSync(file, { force: true }); }
  if (rendered >= MAX) { console.log(`stopping after ${rendered} chunk(s) this run (--max); run again to continue`); process.exit(3); }
  rendered++;
  console.log(`chunk ${k}: rendering frames ${a}-${b} (${b - a + 1} frames) in its own process`);
  const t0 = Date.now();
  run("npx", ["remotion", "render", "src/index.ts", id, `"${file}"`, `--frames=${a}-${b}`, "--codec=h264", "--crf=16", "--muted", "--timeout=600000", "--log=error"]);
  const got = frameCount(file);
  if (got !== b - a + 1) throw new Error(`chunk ${k} has ${got} frames, expected ${b - a + 1}`);
  console.log(`chunk ${k}: done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}

// join losslessly (stream copy), then add the audio
const listFile = join(dir, "parts.txt");
writeFileSync(listFile, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n") + "\n");
const joined = join(dir, "joined.mp4");
run("npx", ["remotion", "ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `"${listFile}"`, "-c", "copy", `"${joined}"`]);
const out = resolve(outFile);
if (AUDIO) run("npx", ["remotion", "ffmpeg", "-v", "error", "-y", "-i", `"${joined}"`, "-i", `"${resolve(AUDIO)}"`, "-map", "0:v:0", "-map", "1:a:0",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", `"${out}"`]);
else run("npx", ["remotion", "ffmpeg", "-v", "error", "-y", "-i", `"${joined}"`, "-c", "copy", `"${out}"`]);
const finalFrames = frameCount(out);
console.log(`${outFile}: ${finalFrames} frames (expected ${frames})${AUDIO ? ", audio from " + AUDIO : ""}`);
if (finalFrames !== frames) throw new Error("frame count mismatch: chunks kept in " + dir);
if (!KEEP) rmSync(dir, { recursive: true, force: true });
