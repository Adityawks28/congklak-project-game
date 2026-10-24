// Plays a move's recorded frames one by one, so marbles visibly drop.
import type { Frame } from './gameLogic.ts';

export type Speed = 'normal' | 'fast' | 'instant';

export const FRAME_MS: Record<Speed, number> = { normal: 250, fast: 90, instant: 0 };
// Long relay moves speed up so one move never drags on (measured: 1 move in
// 12 runs past 48 frames, the longest seen was 330).
export const MOVE_CAP_MS: Record<Speed, number> = { normal: 10000, fast: 4000, instant: 0 };

export interface PlaybackControl {
  cancelled(): boolean;
  skipping(): boolean;
}

export function frameDelay(f: Frame, speed: Speed, total: number): number {
  if (f.event === 'capture') return FRAME_MS[speed] * 3;
  return Math.min(FRAME_MS[speed], MOVE_CAP_MS[speed] / Math.max(total, 1));
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function playFrames(
  frames: Frame[],
  speed: Speed,
  ctl: PlaybackControl,
  onFrame: (f: Frame, i: number) => void,
  sleep: (ms: number) => Promise<void> = wait,
): Promise<'done' | 'cancelled'> {
  for (let i = 0; i < frames.length; i++) {
    if (ctl.cancelled()) return 'cancelled';
    if (speed === 'instant' || ctl.skipping()) {
      onFrame(frames[frames.length - 1], frames.length - 1);
      return 'done';
    }
    onFrame(frames[i], i);
    if (i < frames.length - 1) await sleep(frameDelay(frames[i], speed, frames.length));
  }
  return 'done';
}
