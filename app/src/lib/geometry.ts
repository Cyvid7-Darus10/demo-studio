// Port of window_geometry() in social-cut.py, so the 4:5 and 9:16 preview frames the footage
// the same way the render does.
import type { Aspect, SocialSpec } from './types';

// aspect -> [width, height, caption band, side margin, bottom margin]; matches LAYOUTS in social-cut.py
export const LAYOUTS: Record<Exclude<Aspect, '16:9'>, [number, number, number, number, number]> = {
  '4:5': [1080, 1350, 250, 40, 70],
  '9:16': [1080, 1920, 420, 40, 260],
};

export const SOCIAL_DEFAULTS = {
  fill: 'blur' as const, color: '#F3F3F6', fit: 'contain' as const, focus_x: 0.5, focus_y: 0.5, zoom: 1, radius: 26,
};

export interface Crop { x: number; y: number; w: number; h: number }
export interface Geometry {
  W: number;
  H: number;
  band: number;
  winW: number;
  winH: number;
  x: number;
  y: number;
  crop: Crop;
  radius: number;
}

const even = (n: number) => Math.floor(Math.trunc(n) / 2) * 2;

export function socialEntry(social: SocialSpec[] | undefined, videoKey: string | undefined, aspect: Aspect) {
  if (aspect === '16:9') return undefined;
  const found = social?.find((s) => s.aspect === aspect && (s.video === videoKey || (!s.video && !videoKey)));
  return { ...SOCIAL_DEFAULTS, ...(found ?? {}), aspect };
}

export function windowGeometry(entry: SocialSpec, srcW: number, srcH: number): Geometry {
  const e = { ...SOCIAL_DEFAULTS, ...entry };
  const [W, H, band, side, bottom] = LAYOUTS[e.aspect];
  const winW = W - 2 * side;
  const room = H - band - bottom;
  const aspect = e.fit === 'crop' ? winW / room : srcW / srcH;
  const winH = Math.min(room, even(winW / aspect));
  let cropH = srcH / e.zoom;
  const cropW = Math.min(srcW, cropH * aspect);
  cropH = cropW / aspect;
  const cropX = Math.min(Math.max(e.focus_x * srcW - cropW / 2, 0), srcW - cropW);
  const cropY = Math.min(Math.max(e.focus_y * srcH - cropH / 2, 0), srcH - cropH);
  return {
    W, H, band, winW: even(winW), winH: even(winH), x: side, y: band + Math.floor((room - even(winH)) / 2),
    crop: { x: Math.trunc(cropX), y: Math.trunc(cropY), w: even(cropW), h: even(cropH) }, radius: e.radius,
  };
}

export function captionAt(entry: SocialSpec | undefined, time: number): string | undefined {
  return entry?.captions?.find((c) => time >= c.start && time <= c.end)?.text;
}
