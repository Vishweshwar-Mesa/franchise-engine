// Builds deliverables/demo_video.mp4 from the recording, the narration clips and burned-in
// subtitles. This ffmpeg has no libass, so each subtitle line is drawn as a transparent PNG
// (white text, dark outline) and overlaid for exactly the time its clip plays.
import { chromium } from "playwright";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const WORK = path.resolve("deliverables/video_work");
const OUT = path.resolve("deliverables");
const { video, segs } = JSON.parse(fs.readFileSync(path.join(WORK, "segments.json"), "utf8"));
const cues = JSON.parse(fs.readFileSync(path.join(WORK, "cues.json"), "utf8"));
const GAP = 0.15;
const S0 = segs[0].start;

// Place every clip: sentences of one section play back to back from the section's real start.
let last = 0;
for (const sec of segs) {
  let t = sec.start - S0 + 0.1;
  for (const c of cues.filter((c) => c.section === sec.i)) {
    c.start = t;
    c.end = t + c.dur;
    t = c.end + GAP;
  }
  last = t;
}
const total = Math.min(60, +(cues.at(-1).end + 0.5).toFixed(2));

// subtitles.srt
const ts = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};
fs.writeFileSync(path.join(OUT, "subtitles.srt"), cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n"));

// Subtitle images
const br = await chromium.launch();
const page = await br.newPage({ viewport: { width: 1920, height: 220 } });
for (const [i, c] of cues.entries()) {
  await page.setContent(`<html><body style="margin:0;background:transparent;width:1920px;height:220px;display:flex;align-items:flex-end;justify-content:center">
    <div style="max-width:1720px;text-align:center;font:700 46px/1.25 'Helvetica Neue',Helvetica,Arial,sans-serif;color:#fff;
      -webkit-text-stroke:4px rgba(0,0,0,.92);paint-order:stroke fill;text-shadow:0 2px 8px rgba(0,0,0,.75);padding-bottom:10px">${c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div></body></html>`);
  c.png = path.join(WORK, `sub${i + 1}.png`);
  await page.screenshot({ path: c.png, omitBackground: true });
}
await br.close();

// ffmpeg: trim the recording, overlay subtitles, mix the clips at their start times
const args = ["-v", "error", "-y", "-ss", String(S0), "-t", String(total), "-i", video];
for (const c of cues) args.push("-loop", "1", "-t", String(total), "-i", c.png);
for (const c of cues) args.push("-i", path.join(WORK, c.file));
const n = cues.length;
let f = `[0:v]fps=30,scale=1920:1080,setsar=1[v0];`;
cues.forEach((c, i) => {
  f += `[v${i}][${i + 1}:v]overlay=0:H-h-36:enable='between(t,${c.start.toFixed(3)},${c.end.toFixed(3)})'[v${i + 1}];`;
});
cues.forEach((c, i) => {
  const d = Math.round(c.start * 1000);
  f += `[${n + 1 + i}:a]aresample=48000,adelay=${d}|${d}[a${i}];`;
});
f += cues.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${n}:normalize=0,apad,atrim=0:${total}[aout]`;
args.push("-filter_complex", f, "-map", `[v${n}]`, "-map", "[aout]", "-t", String(total),
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-movflags", "+faststart",
  path.join(OUT, "demo_video.mp4"));
execFileSync("ffmpeg", args, { stdio: "inherit" });
fs.writeFileSync(path.join(WORK, "cues-placed.json"), JSON.stringify(cues, null, 1));
console.log("total", total, "cues", cues.map((c) => `${c.start.toFixed(2)}-${c.end.toFixed(2)}`).join(" "));
