# CLAUDE.md — Quantum 3D Explainer

Interactive single-page 3D app teaching quantum physics through eight live simulations. `PLAN.md` holds the original
architecture and build order; `README.md` holds setup, architecture and the **Assumptions & Simplifications** log.

## Stack

React 19 + TypeScript (strict) + Vite 8 · three.js via @react-three/fiber, @react-three/drei, @react-three/postprocessing ·
GSAP + ScrollTrigger/ScrollToPlugin · Zustand · Tailwind CSS v4 · KaTeX · custom GLSL · Vitest · Web Workers · Playwright + axe-core.

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
`node scripts/shoot.mjs http://localhost:4173 test-results/shots <station…> [--mobile]`.
Env: `WAIT` ms per shot, `Q='&fx=0'` appends URL params, `EVAL` runs page JS (e.g. `$(cat scripts/set-range.js); __setRange('Emission rate', 100)`).
URL flags: `?debug` (fps / draw calls overlay, `window.__quantumPerf`), `?fx=0` (no post-processing), `?sky=0` (no backdrop).
Chromium for Playwright is preinstalled at `/opt/pw-browsers` — never run `playwright install`.

## Verification gate (every change)

`typecheck` → `lint` → `test` → `e2e` → screenshot check → small descriptive commit → push.

## Layout

- `src/physics/` — pure math, colocated `*.test.ts`. ESLint forbids React/three/zustand/gsap imports here.
- `src/workers/` — one `*.worker.ts` + `*Protocol.ts` per simulation; typed messages, transferable buffers.
- `src/scenes/<Name>/` — `Scene.tsx` (default export, receives `{ active }`), `Controls.tsx` (default export, DOM),
  `store.ts` (Zustand), optional pure `engine.ts` + test. Registered in `src/scenes/registry.ts`.
- `src/content/<name>.ts` — copy (Simple + Technical 120–200 words, alt text, analogy, Under-the-hood), registered in `src/content/index.ts`.
- `src/three/` — canvas root, camera rig, stations (`stations.ts` = per-section camera pose), backdrop, effects, shared `ComplexRibbon`, GLSL in `shaders/`.
- `src/ui/` — cards, rail, settings, controls primitives (`Slider`, `Toggle`, `Segmented`, `Button`, `ControlPanel`, `LiveDescription`).

### Adding a scene

1. Physics module + tests against analytic results. 2. Worker if it is heavy. 3. Scene/Controls/store. 4. Copy (the content
   test enforces word counts, KaTeX validity and no consciousness-collapse phrasing). 5. Register in both registries; tune
   `stations.ts`. 6. E2E test in `e2e/smoke.spec.ts`; axe covers it via `e2e/a11y.spec.ts` (add the id). 7. README assumptions.

## Coding conventions

- Complex arrays: interleaved `Float64Array` `[re0, im0, …]` in physics; half floats (`lib/half.ts`) for GPU textures.
- Units: ℏ = m = 1 for wave-packet scenes; atomic units for hydrogen; eV/nm in `physics/applications.ts`. State units in module headers.
- Render loops (`useFrame`, worker steps): **zero allocations** — module/ref-scoped scratch objects, ring buffers,
  `attribute.addUpdateRange` partial uploads; read Zustand via `getState()` in `useFrame`, never re-render per frame.
- Create every three.js geometry/material/texture with `useDisposable(factory, deps)` (hooks/useDisposable.ts).
- Workers: at most one request in flight; display buffers ping-pong (transfer out, transfer back).
- Signed numbers in UI via `num()` (true minus sign). Violet text uses `text-violet-ink` (contrast); `violet` is for marks.
- In copy strings, avoid the TeX thick space `\;` — use `\,` or `\quad` (backslash-semicolon has been mangled before).
- No placeholder assets, TODO stubs, or lorem ipsum.

## Physics-accuracy rules (non-negotiable)

- Real math only: split-step Fourier TDSE for wave-packet scenes; hydrogen R_nl × real Y_lm for orbitals; genuine Born-rule sampling for every measurement.
- Test against analytic results (normalization/unitarity, σ(t), Δx·Δp = ℏ/2, barrier T(E), hydrogen ⟨r⟩/nodes/energies, Y_lm orthonormality, E = −cos Δ, CHSH/Mermin bounds, Grover).
- Measurement = physical interaction/decoherence — never consciousness. Every analogy in `<Analogy>` (visibly labelled).
- Every section has "Under the hood": governing equations + numerical method.
- Approximations: implement, comment inline (`APPROX:` or an explanatory block), log in README → Assumptions & Simplifications.

## Performance budgets

60 fps on a 2020-era laptop; ≥ 30 fps mid-range mobile. Instanced meshes / GPU points; active station ± 1 mounted;
adaptive tier (`low/medium/high`, `lib/quality.ts`) with manual override. Headless Chromium is software WebGL — its fps is
a lower bound only; watch draw calls and per-frame work instead.

## Design tokens

Base `#05060a`; accents cyan `#22e4ff`, violet `#8b5cf6` (text: `#a78bfa`), magenta `#ff3dbb`; chart series (validated,
dark surface) `#2196c0` / `#e94f9f`. Space Grotesk (display), Inter (body). Glass cards, bloom, vignette, subtle CA,
DOF during camera flights. Camera eases — cuts only under reduced motion.
