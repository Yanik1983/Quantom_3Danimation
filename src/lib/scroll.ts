import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { useNav } from '../state/nav';
import { selectReducedMotion, useSettings } from '../state/settings';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/** Cached document-space geometry of each station's scroll section. */
const tops: number[] = [];
const heights: number[] = [];

function measure(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-station]');
  tops.length = 0;
  heights.length = 0;
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    tops.push(r.top + window.scrollY);
    heights.push(Math.max(1, r.height));
  });
}

function update(): void {
  const y = window.scrollY;
  const n = tops.length;
  if (n === 0) return;
  let i = 0;
  while (i < n - 1 && y >= tops[i + 1]) i++;
  const f = Math.min(1, Math.max(0, (y - tops[i]) / heights[i]));
  useNav.getState().setP(Math.min(i + f, n - 1));
}

/** Wire ScrollTrigger to the nav store. Returns a cleanup function. */
export function initScrollSync(): () => void {
  const st = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    onUpdate: update,
    onRefresh: () => {
      measure();
      update();
    },
  });
  measure();
  update();
  return () => st.kill();
}

/** Scroll so that `station` is in its dwell zone; the camera follows the scroll. */
export function jumpToStation(station: number, opts: { instant?: boolean } = {}): void {
  if (tops.length === 0) measure();
  const i = Math.max(0, Math.min(tops.length - 1, station));
  const y = tops[i] + (i === 0 ? 0 : heights[i] * 0.02);
  const reduced = selectReducedMotion(useSettings.getState());
  const from = useNav.getState().p;
  const distance = Math.abs(from - i);
  gsap.killTweensOf(window);
  if (opts.instant || reduced) {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    return;
  }
  gsap.to(window, {
    scrollTo: { y, autoKill: true },
    duration: Math.min(2.4, 0.9 + 0.3 * distance),
    ease: 'power2.inOut',
  });
}
