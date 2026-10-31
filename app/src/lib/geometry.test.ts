import { describe, expect, it } from 'vitest';
import { socialEntry, windowGeometry } from './geometry';
import { runPython } from './python';
import type { SocialSpec } from './types';

const CASES: SocialSpec[] = [
  { aspect: '4:5' },
  { aspect: '9:16' },
  { aspect: '4:5', fit: 'crop', focus_x: 0.5 },
  { aspect: '9:16', fit: 'crop', focus_x: 0.4, zoom: 1.2 },
  { aspect: '9:16', fit: 'crop', focus_x: 0.9, focus_y: 0.1, zoom: 2, radius: 0 },
];

describe('social framing', () => {
  it('matches window_geometry() in social-cut.py', () => {
    const py = runPython<Record<string, string | number>[]>(`
sc = load("sc", "social-cut.py")
print(json.dumps([sc.window_geometry(sc.with_defaults(e), 1920, 1080) for e in json.load(sys.stdin)]))
`, CASES);
    CASES.forEach((entry, i) => {
      const g = windowGeometry(entry, 1920, 1080);
      const p = py[i];
      expect([g.W, g.H, g.band, g.winW, g.winH, g.x, g.y]).toEqual([p.W, p.H, p.band, p.win_w, p.win_h, p.x, p.y]);
      expect(`${g.crop.w}:${g.crop.h}:${g.crop.x}:${g.crop.y}`).toBe(p.crop);
    });
  });

  it('picks the social entry for the video and aspect, with defaults', () => {
    const social: SocialSpec[] = [{ video: 'PROMO', aspect: '9:16', fill: 'color', color: '#F3F3F6' }];
    expect(socialEntry(social, 'PROMO', '9:16')).toMatchObject({ fill: 'color', fit: 'contain', radius: 26 });
    expect(socialEntry(social, 'PROMO', '4:5')).toMatchObject({ fill: 'blur', aspect: '4:5' });
    expect(socialEntry(social, 'PROMO', '16:9')).toBeUndefined();
  });
});
