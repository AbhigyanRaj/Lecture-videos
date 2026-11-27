// Render many scenes with a pool of headless pages. node render_jobs.mjs jobs.json
// jobs: [{data: "scene.json", out: "scene.mp4"}]   (video only; audio is muxed once for the whole block)
// env: FPS=24 WORKERS=3. Existing outputs are skipped, so a re-run only renders what changed or was deleted.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
const B = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// argv[2]: jobs.json ([{data,out}]) or a .txt list of scene names (then SCENES_DIR / OUT_DIR env are used)
const arg = process.argv[2];
const jobs = (arg.endsWith('.txt')
  ? fs.readFileSync(arg, 'utf8').split('\n').filter(Boolean).map(n => ({ data: `${process.env.SCENES_DIR}/${n}.json`, out: `${process.env.OUT_DIR}/${n}.mp4` }))
  : JSON.parse(fs.readFileSync(arg))).filter(j => !fs.existsSync(j.out));
if (process.env.OUT_DIR) fs.mkdirSync(process.env.OUT_DIR, { recursive: true });
const ASSET_ROOT = process.env.ASSET_ROOT;       // remap image paths when rendering on another machine
const ENC = process.env.ENC || 'videotoolbox';
const FPS = +(process.env.FPS || 24), WORKERS = +(process.env.WORKERS || 3);
const launch = { args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] };
if (process.platform === 'darwin') {
  const cache = process.env.HOME + '/Library/Caches/ms-playwright';
  const exe = fs.readdirSync(cache).filter(d => d.startsWith('chromium_headless_shell-')).sort().pop();
  launch.executablePath = `${cache}/${exe}/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
}
// one browser per ~3 workers: a single browser serialises screenshot compositing across many pages
const NB = Math.max(1, Math.ceil((+(process.env.WORKERS || 3)) / (+(process.env.PAGES_PER_BROWSER || 3))));
const browsers = await Promise.all([...Array(NB)].map(() => chromium.launch(launch)));
const VCODEC = ENC === 'x264'
  ? ['-c:v', 'libx264', '-preset', process.env.X264_PRESET || 'veryfast', '-crf', process.env.CRF || '21', '-tune', 'animation', '-g', '48', '-profile:v', 'high', '-level', '4.1', '-x264-params', 'threads=2']
  : ['-c:v', 'h264_videotoolbox', '-b:v', '12M', '-maxrate', '18M', '-profile:v', 'high'];
let next = 0, done = 0, frames = 0; const t0 = Date.now(), total = jobs.length;
console.log(`rendering ${total} scenes with ${WORKERS} workers`);
async function worker(w) {
  const page = await browsers[w % browsers.length].newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + B + '/engine/player.html');
  const cdp = await page.context().newCDPSession(page);
  while (next < jobs.length) {
    const j = jobs[next++]; const D = JSON.parse(fs.readFileSync(j.data));
    if (ASSET_ROOT) for (const k in D.img) D.img[k] = 'file://' + ASSET_ROOT + '/assets/img/' + D.img[k].split('/assets/img/').pop();
    errs.length = 0;
    await page.evaluate(D => window.init(D), D);
    const N = Math.round(D.timing.dur * FPS), tmp = j.out + '.tmp.mp4';
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      ...VCODEC, '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < N; i++) {
      await page.evaluate(t => window.render(t), i / FPS);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
    if (code) { console.error('ffmpeg failed', j.out); continue; }
    fs.renameSync(tmp, j.out); frames += N; done++;
    const el = (Date.now() - t0) / 1000;
    console.log(`[${done}/${total}] ${path.basename(j.out)} ${N}f ${errs.length ? 'ERR ' + errs[0] : ''} | ${(frames / el).toFixed(1)} fps, ${(el / 60).toFixed(1)} min`);
  }
  await page.close();
}
await Promise.all([...Array(WORKERS).keys()].map(worker));
await Promise.all(browsers.map(b => b.close()));
console.log('ALL SCENES DONE');
