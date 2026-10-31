// Screenshots for the README and for a layout check at common laptop sizes, both themes.
// Usage: npm run screenshots -w app        (writes docs/img/studio-*.png)
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { exampleCopy, launch, REPO, startServer } from './harness.mjs';

const OUT = join(REPO, 'docs', 'img');
const SHOTS = [
  { name: 'studio-dark-1440', theme: 'dark', width: 1440, height: 900 },
  { name: 'studio-light-1440', theme: 'light', width: 1440, height: 900 },
  { name: 'studio-dark-1280', theme: 'dark', width: 1280, height: 800 },
  { name: 'studio-light-1280', theme: 'light', width: 1280, height: 800 },
  { name: 'studio-9x16-dark-1440', theme: 'dark', width: 1440, height: 900, aspect: '9x16' },
  { name: 'studio-render-light-1440', theme: 'light', width: 1440, height: 900, render: true },
];

const { folder, cleanup } = exampleCopy();
let server;
let browser;
try {
  const cards = spawnSync(process.execPath, [join(REPO, 'scripts', 'title-cards.mjs'), 'handoff.json'], { cwd: folder, stdio: 'ignore' });
  if (cards.status !== 0) throw new Error('title-cards.mjs failed');
  server = await startServer(folder, 4617);
  browser = await launch();
  mkdirSync(OUT, { recursive: true });
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    await page.addInitScript((theme) => localStorage.setItem('demo-studio-theme', theme), shot.theme);
    await page.goto(server.url);
    await page.waitForSelector('[data-testid="shot"]');
    await page.locator('[data-shot-id="0:1:1"]').click();
    await page.evaluate(() => document.querySelector('[data-testid="ruler"]'));
    if (shot.aspect) await page.click(`[data-testid="aspect-${shot.aspect}"]`);
    // Park the playhead inside the selected shot so the preview shows a frame and its on-screen text.
    const box = await page.locator('[data-shot-id="0:1:1"]').boundingBox();
    const ruler = await page.locator('[data-testid="ruler"]').boundingBox();
    if (box && ruler) await page.mouse.click(box.x + box.width * 0.4, ruler.y + ruler.height / 2);
    if (shot.render) {
      await page.click('[data-testid="render-button"]');
      await page.click('[data-testid="render-cards"]');
      await page.waitForSelector('[data-testid="render-drawer"][data-status="done"]', { timeout: 60000 });
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(OUT, `${shot.name}.png`) });
    await page.close();
    console.log(`wrote docs/img/${shot.name}.png`);
  }
} catch (error) {
  console.error(`screenshots failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  server?.stop();
  cleanup();
}
