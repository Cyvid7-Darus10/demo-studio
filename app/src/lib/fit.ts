// Voiceover fit, the same rule as build-handoff.py: a scene's line starts lead_in seconds into
// the scene and must end before the next narrated scene starts (or the video ends).
import type { Timeline } from './types';

export interface VoiceoverFit {
  sceneIndex: number;
  text: string;
  words: number;
  start: number; // timeline seconds the line starts
  seconds: number; // estimated spoken length
  available: number; // seconds until the next line (or the end)
  fits: boolean;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function spokenSeconds(text: string, rateWpm: number): number {
  return (wordCount(text) / rateWpm) * 60;
}

export function voiceoverFits(timeline: Timeline): VoiceoverFit[] {
  const narrated = timeline.scenes.filter((s) => s.voiceover);
  return narrated.map((scene, i) => {
    const text = scene.voiceover ?? '';
    const start = scene.start + timeline.leadIn;
    const next = narrated[i + 1];
    const available = (next ? next.start : timeline.total) - start;
    const seconds = spokenSeconds(text, timeline.rateWpm);
    return { sceneIndex: scene.index, text, words: wordCount(text), start, seconds, available, fits: seconds <= available };
  });
}
