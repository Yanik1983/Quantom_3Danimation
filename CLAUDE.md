# CLAUDE.md — Quantum 3D Explainer

Interactive single-page 3D app teaching quantum physics. See `PLAN.md` for architecture and build order.
Status: planning — toolchain not yet scaffolded (commands below become valid after step 0).

## Stack

React 19 + TypeScript (strict) + Vite · three.js via @react-three/fiber, @react-three/drei, @react-three/postprocessing ·
GSAP + ScrollTrigger/ScrollToPlugin · Zustand · Tailwind CSS v4 · KaTeX · custom GLSL · Vitest · Web Workers · Playwright (smoke/e2e).

## Commands

| Task                          | Command                                  |
| ----------------------------- | ---------------------------------------- |
| Dev server                    | `npm run dev`                            |
| Typecheck                     | `npm run typecheck`                      |
| Lint / format                 | `npm run lint` · `npm run format`        |
| Physics unit tests            | `npm test` (watch: `npm run test:watch`) |
| E2E smoke (headless Chromium) | `npm run e2e`                            |
| Production build / preview    | `npm run build` · `npm run preview`      |

Chromium for Playwright is preinstalled at `/opt/pw-browsers` — never run `playwright install`.

## Verification gate (after every scene / step)

dev boots → `typecheck` → `lint` → `test` → `e2e` smoke → visual check → commit (small, descriptive) → push.
Do not start the next scene until the current one passes.

## Coding conventions

- `src/physics/**` is **pure**: no imports from React, three, DOM, or any npm package. Deterministic (seeded RNG passed in). Each module has a colocated `*.test.ts` written alongside the math.
- Complex arrays: interleaved `Float64Array` `[re0, im0, re1, im1, …]` in physics; `Float32Array` for GPU upload.
- Units: ℏ = m = 1 for wave-packet scenes; atomic units for hydrogen. Document units in each module header.
- Render loops (`useFrame`, worker step loops): **zero allocations** — pre-allocate vectors/buffers at module or ref scope; read Zustand via `getState()` inside `useFrame`, never subscribe-and-rerender per frame.
- Every imperatively created three resource (`DataTexture`, `BufferGeometry`, material) is disposed on unmount.
- Scenes are lazy-loaded (`React.lazy`) and mounted only when active ±1.
- Workers talk via `src/workers/rpc.ts` with transferable buffers; no per-frame buffer allocation (ping-pong).
- Components: function components, named exports, one component per file; Tailwind for DOM chrome; shaders in `src/three/shaders/*.glsl`.
- Scientific copy lives in `src/content/*.ts` (simple + technical variants, 120–200 words each, alt text, Under-the-hood equation + method).
- No placeholder assets, TODO stubs, or lorem ipsum. Ever.

## Physics-accuracy rules (non-negotiable)

- Real math only: split-step Fourier TDSE for wave-packet scenes; actual (real) spherical harmonics × hydrogen radial functions for orbitals; genuine Born-rule probabilities for every measurement.
- Test against analytic results: normalization/unitarity, Gaussian spreading σ(t), Δx·Δp = ℏ/2 for Gaussians, rectangular-barrier T(E), hydrogen ⟨r⟩ and node counts, spherical-harmonic orthonormality, E(a,b) = −cos(a−b), CHSH bounds.
- Never imply consciousness causes collapse — measurement = physical interaction / decoherence.
- Every analogy is visibly labeled as an analogy (`<Analogy>` component).
- Every section has an "Under the hood" panel: governing equation (KaTeX) + numerical method.
- Any approximation for performance: implement it, mark inline with `// APPROX:` and log it in README → "Assumptions & Simplifications".

## Performance budgets

- 60 fps on a 2020-era laptop; ≥ 30 fps on mid-range mobile.
- Instanced meshes, GPU-side particles, zero per-frame allocations.
- Adaptive quality tier (`low/medium/high`) from frame timing, with manual override in Settings. Tier controls DPR cap, grid sizes, particle counts, post-FX.
- Honor `prefers-reduced-motion`: no camera flights (snap), no DOF/CA; simulations remain interactive.
- Headless Chromium here uses software WebGL — treat its fps as a lower bound; also track draw calls and frame CPU time.

## Design tokens

Base `#05060a`; accents cyan `#22e4ff`, violet `#8b5cf6`, magenta `#ff3dbb`. Space Grotesk (headings), Inter (body). Glass cards over canvas; tasteful bloom, vignette, subtle chromatic aberration, DOF on focus transitions. Camera eases — never cuts (except reduced-motion).
