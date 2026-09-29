# CLAUDE.md — Quantum Lab

A glowing 3D lab that tells one story: learn three tricks of tiny particles, then use them to find a hidden card in one
look. Welcome (goal + **Start**) → four steps (ids `basics` = waves/double slit, `qubits` = 0 and 1 at once, merged
superposition + qubits, `entanglement` = linked qubits (Φ⁺, always the same bit), `search` = you lift cups, then Grover)
→ finale (`#finale`: the three tricks, uses, a myth) → the real machine (`#computer`, also by clicking the gold
refrigerator). Each card: question title, short text, **Try it**, controls with a **What you saw** box that explains
the result after the visitor acts, then "In the quantum computer". `README.md` holds setup, architecture and the **Assumptions & Simplifications** log;
`PLAN.md` holds the original plan and the phase-2 redesign brief. **The user wants to be consulted before updates**:
propose changes (and show screenshots) before building or deploying. Pushing to the default branch redeploys Pages.

## Stack

React 19 + TypeScript (strict) + Vite 8 · three.js via @react-three/fiber, @react-three/drei, @react-three/postprocessing ·
Zustand · Tailwind CSS v4 · KaTeX · custom GLSL · Vitest · Web Workers · Playwright + axe-core.

## Commands

| Task                                | Command                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| Dev server                          | `npm run dev`                                                    |
| Typecheck                           | `npm run typecheck`                                              |
| Lint / format                       | `npm run lint` · `npm run format`                                |
| Unit tests (physics, engines, copy) | `npm test` (watch: `npm run test:watch`)                         |
| E2E (build + Playwright + axe)      | `npm run e2e` (one file: `npx playwright test e2e/a11y.spec.ts`) |
| Production build / preview          | `npm run build` · `npm run preview`                              |

Visual check: `npm run build && npx vite preview --port 4173 &` then
`node scripts/shoot.mjs http://localhost:4173 test-results/shots <lab|basics|qubits|entanglement|search|finale|computer> [--mobile]`.
Env: `WAIT` ms per shot, `Q='&fx=0'` appends URL params, `EVAL` runs page JS (e.g. `$(cat scripts/set-range.js); __setRange('Emission rate', 100)`).
URL flags: `?debug` (fps / draw calls overlay, `window.__quantumPerf`), `?fx=0` (no post-processing), `?room=0` (no room),
`?cam=x,y,z,lookX,lookY,lookZ` (pin the camera for close-up shots, e.g. of the cryostats).
Chromium for Playwright is preinstalled at `/opt/pw-browsers` — never run `playwright install`.

## Verification gate (every change)

`typecheck` → `lint` → `test` → `e2e` → screenshot check → small descriptive commit → push.

## Layout

- `src/physics/` — pure math, colocated `*.test.ts`. ESLint forbids React/three/zustand/gsap imports here.
- `src/workers/` — `doubleSlit.worker.ts` + `doubleSlitProtocol.ts`; typed messages, transferable buffers.
- `src/state/lab.ts` — open step, `panel` (`computer` | `finale`) + visited set, synced with the URL hash / browser history.
- `src/scenes/<Name>/` — `Scene.tsx` (default export, `{ active }`; table-local coords, top at y = 0; idles in the lab,
  resets its store when opened), `Controls.tsx` (2–3 controls, DOM), `store.ts`, optional pure `engine.ts` + test.
  Registered in `src/scenes/registry.ts` (keyed by `ExperimentId`).
- `src/content/experiments.ts` — all copy: name, question title, short text (≤ 45 words, no equations), `tryIt` lines,
  `inComputer`, Learn more (equations + ≤ 110 words), alt text; plus WELCOME, FINALE, COMPUTER. The "What you saw"
  lines are UI strings in `i18n.ts`. Keep one vocabulary: measure, chance, mix (superposition), linked (entangled),
  wave / cancel. `experiments.he.ts` is the Hebrew twin (≥ 30 words; shares the
  equations — KaTeX cannot set Hebrew). `i18n.ts` holds UI strings per language: **every visible string goes through
  `useUi()` / `useContent()`, in both languages.** Use logical classes (`ms-`/`me-`/`start-`/`end-`, `text-start`).
- `src/three/` — canvas root, `Lab.tsx` (room + tables), `tables.ts` (table positions + close-up camera poses),
  `LabCamera.tsx`, `room/` (the quantum-computing lab around the tables), effects, GLSL in `shaders/`.
- `src/ui/` — `LabOverlay` (welcome + Start + menu/tiles), `ExperimentCard` (+ `LearnMore`), `FinaleCard`, `ComputerCard`,
  settings, controls primitives (incl. `Saw` = the What-you-saw box, `Stepper`).

### Adding a step (consult the user first — they approved exactly these four and the story around them)

1. Physics module + tests. 2. Worker if heavy. 3. Scene/Controls/store. 4. Copy in `experiments.ts` (the content test
   enforces length, KaTeX validity, no consciousness-collapse phrasing). 5. Add the id to `EXPERIMENTS`, the registry and
   `tables.ts`. 6. E2E in `e2e/smoke.spec.ts`; add the id to `e2e/a11y.spec.ts`. 7. README assumptions.

## Coding conventions

- Complex arrays: interleaved `Float64Array` `[re0, im0, …]` in physics; half floats (`lib/half.ts`) for GPU textures.
- Units: ℏ = m = 1 for the double slit. State units in module headers.
- Render loops (`useFrame`, worker steps): **zero allocations** — module/ref-scoped scratch objects, ring buffers,
  `attribute.addUpdateRange` partial uploads; read Zustand via `getState()` in `useFrame`, never re-render per frame.
- Create every three.js geometry/material/texture with `useDisposable(factory, deps)` (hooks/useDisposable.ts).
- Keep it simple: short text, 2–3 controls, results shown only where they teach something. Signed numbers use a true minus sign (−).
  Violet text uses `text-violet-ink` (contrast); `violet` is for marks. Measurement randomness uses `lib/random.ts`.
- In copy strings, avoid the TeX thick space `\;` — use `\,` or `\quad` (backslash-semicolon has been mangled before).
- No placeholder assets, TODO stubs, or lorem ipsum.

## Physics-accuracy rules (non-negotiable)

- Real math only: split-step Fourier TDSE for the double slit; genuine Born-rule sampling for every Look / Measure / pair.
- Test against analytic results (unitarity, fringe spacing, Born frequencies within 4σ, E = −cos Δ, CHSH/Mermin bounds,
  product-state probabilities).
- Measurement = physical interaction/decoherence — never consciousness ("looking" = light interacting).
- Every experiment has "Learn more" with the governing equations and a note on how it is simulated.
- Approximations: implement, comment inline (`APPROX:` or an explanatory block), log in README → Assumptions & Simplifications.

## Performance budgets

60 fps on a 2020-era laptop; ≥ 30 fps mid-range mobile. Instanced meshes / GPU points; all four small models stay mounted;
adaptive tier (`low/medium/high`, `lib/quality.ts`) with manual override. Headless Chromium is software WebGL — its fps is
a lower bound only; watch draw calls and per-frame work instead.

## Design tokens

Base `#05060a`; accents cyan `#22e4ff`, violet `#8b5cf6` (text: `#a78bfa`), magenta `#ff3dbb`; chart series (validated,
dark surface) `#2196c0` / `#e94f9f`. Space Grotesk (display), Inter (body). Glass cards, bloom, vignette, subtle CA,
DOF during camera glides. Camera eases — cuts only under reduced motion.
