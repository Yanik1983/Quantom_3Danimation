import { jumpToStation } from '../lib/scroll';

export function Hero() {
  return (
    <section
      id="intro"
      data-station={0}
      aria-labelledby="intro-title"
      className="pointer-events-none relative h-[170vh]"
    >
      <div className="sticky top-0 flex h-svh items-center px-4 pt-16 max-md:items-end max-md:pb-10 md:px-8 md:pr-20">
        <div className="pointer-events-auto max-w-xl space-y-6">
          <p className="font-display text-xs font-medium tracking-[0.3em] text-cyan uppercase">
            An interactive 3D explainer
          </p>
          <h1
            id="intro-title"
            className="font-display text-5xl leading-[1.05] font-semibold text-white md:text-7xl"
          >
            Quantum,
            <br />
            <span className="bg-gradient-to-r from-cyan via-violet to-magenta bg-clip-text text-transparent">
              up close.
            </span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-slate-300">
            Eight small experiments that reveal how the universe really behaves at its smallest scales. Every
            simulation here runs genuine quantum mechanics in your browser — touch it, break it, watch what
            happens.
          </p>
          <button
            type="button"
            onClick={() => jumpToStation(1)}
            className="glass group inline-flex items-center gap-3 rounded-full px-6 py-3 font-medium text-white transition hover:border-cyan/50"
          >
            Begin the journey
            <span aria-hidden="true" className="text-cyan transition-transform group-hover:translate-y-0.5">
              ↓
            </span>
          </button>
          <p className="sr-only">
            Visualization: two glowing circular waves spread across a dark plane and overlap, producing a fan
            of bright and dark stripes where they reinforce or cancel.
          </p>
        </div>
      </div>
    </section>
  );
}
