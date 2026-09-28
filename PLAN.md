# PLAN — Interactive 3D Quantum Physics Explainer

Status: **implemented** (steps 0–10). This document is kept as the original plan; the deviations below record what
changed during the build and why.

### Deviations from the plan

- **Double slit:** a tall real-potential wall leaked under split-step (V·Δt ≫ 1 is under-resolved), so the mask is a
  complex absorber. Only the upper-slit wave is simulated and the lower one is its mirror image; this is validated
  against a direct two-slit run. The geometry favours crisp fringes. With which-path detection this gives one smooth
  band rather than the "two bands" in the brief (separated bands need a near-field geometry, where fringes fade), so hits
  are colour-coded by the recorded slit instead.
- **Workers:** a typed `*Protocol.ts` per worker instead of one generic `rpc.ts`.
- **Uncertainty / tunnelling** share a `ComplexRibbon` renderer; uncertainty runs on the main thread (a 0.2 ms FFT per
  edit) because it is not heavy.
- **Entanglement:** both the Mermin (3-setting) and CHSH forms, side by side with a local hidden-variable model.
- **Applications:** one interactive vignette at a time (transistor, MRI, laser, 3-qubit Grover search).
- **Added:** an axe accessibility audit in e2e, portrait-aware camera framing, and vendor chunk splitting.

---

## 1. Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────────┐
│ DOM layer (React + Tailwind)                                         │
│  ProgressRail · SettingsMenu · 8× <Section> (glass cards, controls,  │
│  "Under the hood" KaTeX panel, Simple⇄Technical toggle, a11y text)   │
│        │ GSAP ScrollTrigger writes scroll progress ─┐                │
├────────┼────────────────────────────────────────────┼────────────────┤
│ Zustand stores                                      ▼                │
│  useNav (activeSection, progress, flyTo)  useSettings (tier, motion) │
│  per-scene sim stores (useDoubleSlit, useBloch, …)                   │
├──────────────────────────────────────────────────────────────────────┤
│ ONE persistent <Canvas> (R3F), fixed behind the DOM                  │
│  CameraRig (damped, reads nav store transiently in useFrame)         │
│  SceneWindow: lazy-mounts only active ±1 "stations" in world space   │
│  Effects: Bloom · Vignette · ChromaticAberration · DepthOfField      │
│  Custom ShaderMaterials fed by DataTextures / instanced attributes   │
├──────────────────────────────────────────────────────────────────────┤
│ Web Workers (heavy numerics)          │ /src/physics (pure TS)       │
│  tdse1d.worker · tdse2d.worker ·      │  complex, fft, splitStep1d/2d│
│  orbital.worker — typed RPC,          │  hydrogen, sphericalHarmonics│
│  transferable Float32Array buffers    │  bloch, born, bell, stats,   │
│  (double-buffered, no per-frame GC)   │  barrier, rng — Vitest-tested│
└──────────────────────────────────────────────────────────────────────┘
```

### Key decisions

| Decision                 | Choice                                                                                                                                                                                                                                          | Why                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Canvas topology          | **Single persistent Canvas**, each concept is a "station" placed along a gentle 3D curve in world space                                                                                                                                         | Makes eased camera flights between concepts real (no cuts), one WebGL context (mobile-safe), shared post-processing. |
| Scroll → camera          | ScrollTrigger per DOM section writes `{index, localProgress}` into Zustand; `CameraRig` reads it via `getState()` inside `useFrame` and critically-damps toward a per-station camera pose                                                       | No React re-render per scroll tick; zero allocations (pre-allocated `Vector3`s).                                     |
| Rail jumps               | `gsap.to(window, { scrollTo })` (ScrollToPlugin) → camera follows scroll                                                                                                                                                                        | One source of truth for position; keyboard/URL-hash work for free.                                                   |
| Reduced motion           | `prefers-reduced-motion` (plus manual toggle) → rail jumps are instant, CameraRig snaps (no flight), DOF/CA disabled; simulations stay live                                                                                                     | Brief requirement.                                                                                                   |
| Scene lifecycle          | `React.lazy` per scene + `SceneWindow` mounts only `active ± 1`; unmount disposes geometries/materials/`DataTexture`s (R3F auto-dispose + explicit `dispose()` for imperatively created resources)                                              | Memory + GPU budget on mobile.                                                                                       |
| Numerics off main thread | Hand-rolled typed RPC over `postMessage` with transferable buffers (no Comlink)                                                                                                                                                                 | Keeps deps minimal; buffers ping-pong between worker and main so nothing is allocated per frame.                     |
| Physics units            | ℏ = m = 1 (natural units) for wave-packet scenes; atomic units (a₀ = 1) for hydrogen                                                                                                                                                            | Clean math, easy analytic test targets. UI labels translate to physical meaning.                                     |
| Rendering of ψ           | Custom GLSL: vertex displacement from a float `DataTexture` holding (Re ψ, Im ψ); fragment shader maps arg ψ → hue (cyclic, perceptually-balanced ramp), \|ψ\|² → emissive intensity                                                            | Brief: no sprite fakes.                                                                                              |
| Particles                | `InstancedMesh` / `THREE.Points` with custom shader; positions sampled in workers from the true \|ψ\|² (alias-method / inverse-CDF sampling)                                                                                                    | Genuine Born-rule statistics, GPU-side rendering.                                                                    |
| Quality tiers            | `low / medium / high`; initial guess from `navigator.hardwareConcurrency`, device memory, touch, and GPU renderer string; then drei `PerformanceMonitor` frame-timing adapts up/down; manual override in Settings (persisted to `localStorage`) | Tier drives: DPR cap, grid resolution, particle counts, post-FX set.                                                 |
| Copy                     | `/src/content/<section>.ts` — `{ simple, technical, analogyNotes, altText, underTheHood: { equation (TeX), method } }`                                                                                                                          | Content separate from components; easy review of scientific wording.                                                 |
| Styling                  | Tailwind v4 (CSS-first config) + a tiny token layer: `#05060a` base, cyan `#22e4ff`, violet `#8b5cf6`, magenta `#ff3dbb`; Space Grotesk (headings) + Inter (body) self-hosted via `@fontsource`                                                 | No external CDN at runtime.                                                                                          |

### Numerical methods (what each scene actually computes)

| Scene             | Method                                                                                                                                                                                                                                                                                                                                                                                                                    | Grid / budget (high tier)                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Double slit       | 2D TDSE, split-step Fourier (Strang splitting) with absorbing boundary (complex absorbing potential) on a wall-with-two-slits potential. Screen distribution = time-integrated probability current through the detector line. **Measure at slits** = decoherent sum \|ψ₁\|²+\|ψ₂\|² of single-slit propagations (which-path info destroys the cross term). Detector hits drawn from that distribution via alias sampling. | 256×256, precomputed once in worker (~1–2 s), then live wave animation replays cached frames |
| Wavefunction      | 2D ψ(x,y) as superposition of user-draggable Gaussian wave packets (each with momentum); optional live evolution via 2D split-step                                                                                                                                                                                                                                                                                        | 128×128 live in worker                                                                       |
| Superposition     | Exact 2-level algebra: \|ψ⟩ = cos(θ/2)\|0⟩ + e^{iφ} sin(θ/2)\|1⟩; measurement in Z/X/Y basis with Born probabilities; seeded RNG; running histogram vs. prediction                                                                                                                                                                                                                                                        | trivial                                                                                      |
| Orbitals          | Hydrogen ψ_nlm = R_nl(r)·Y_lm^real(θ,φ): R via associated Laguerre (recurrence), Y via associated Legendre (stable recurrence) → real combos. Points sampled from \|ψ\|² with rejection sampling in spherical coords (proposal ∝ radial envelope). Sign of ψ → color. Cross-section = shader clip plane.                                                                                                                  | n ≤ 4 (all l, m), 60k points high / 15k low                                                  |
| Uncertainty       | 1D ψ(x) on N-point grid; φ(p) via FFT; Δx, Δp computed numerically from the discrete distributions; shapes: Gaussian (saturates ℏ/2), square, two-hump                                                                                                                                                                                                                                                                    | N = 1024                                                                                     |
| Tunneling         | 1D TDSE split-step with rectangular barrier + absorbing edges; live T = ∫_{x>barrier} \|ψ\|² after scattering; compared with analytic plane-wave T(E) averaged over packet's momentum spread                                                                                                                                                                                                                              | N = 2048, several steps/frame in worker                                                      |
| Entanglement      | Singlet state, detector angles a, b; outcomes sampled from P(same) = sin²((a−b)/2); running CHSH S vs. classical bound 2 and Tsirelson 2√2; side-by-side a local-hidden-variable model (shown to stay ≤ 2)                                                                                                                                                                                                                | trivial                                                                                      |
| Where it shows up | Procedural vignettes reusing earlier physics: transistor (tunneling current), MRI (spin precession/Larmor on Bloch sphere), laser (stimulated emission cascade), quantum computer (register of Bloch spheres)                                                                                                                                                                                                             | reuses modules                                                                               |

---

## 2. File structure

```
/
├─ PLAN.md  CLAUDE.md  README.md
├─ index.html  vite.config.ts  vitest.config.ts  tsconfig*.json
├─ eslint.config.js  .prettierrc
├─ public/                         (favicon, og image — generated, not placeholder)
├─ e2e/smoke.spec.ts               (Playwright: boots, canvas renders, no console errors, frame-time sample)
└─ src/
   ├─ main.tsx  App.tsx  index.css
   ├─ physics/                     ← pure, dependency-free, no DOM/three imports
   │  ├─ complex.ts        + complex.test.ts
   │  ├─ fft.ts            + fft.test.ts           (radix-2, in-place, 1D & 2D)
   │  ├─ grid.ts                                  (x/k grids, integration helpers)
   │  ├─ splitStep1d.ts    + splitStep1d.test.ts
   │  ├─ splitStep2d.ts    + splitStep2d.test.ts
   │  ├─ potentials.ts                            (barrier, slits, harmonic, CAP)
   │  ├─ barrier.ts        + barrier.test.ts       (analytic T(E), R(E))
   │  ├─ wavepacket.ts     + wavepacket.test.ts    (Gaussian, moments Δx Δp)
   │  ├─ legendre.ts / laguerre.ts / sphericalHarmonics.ts / hydrogen.ts + tests
   │  ├─ sampling.ts       + sampling.test.ts      (alias table, rejection, seeded RNG)
   │  ├─ bloch.ts          + bloch.test.ts
   │  ├─ bell.ts           + bell.test.ts          (quantum + LHV models, CHSH)
   │  └─ index.ts
   ├─ workers/
   │  ├─ rpc.ts                                   (typed request/response, transferables)
   │  ├─ tdse1d.worker.ts  tdse2d.worker.ts  orbital.worker.ts  doubleSlit.worker.ts
   ├─ state/
   │  ├─ nav.ts  settings.ts  quality.ts
   │  └─ sims/ doubleSlit.ts wavefunction.ts bloch.ts orbitals.ts uncertainty.ts tunneling.ts bell.ts
   ├─ three/
   │  ├─ CanvasRoot.tsx  CameraRig.tsx  SceneWindow.tsx  Effects.tsx  Starfield.tsx
   │  ├─ stations.ts                              (world-space pose per section)
   │  ├─ shaders/ psiSurface.{vert,frag}.glsl  probabilityCloud.* detectorHits.* phaseRibbon.* common/colormap.glsl
   │  └─ materials/                               (typed shaderMaterial wrappers)
   ├─ scenes/
   │  ├─ DoubleSlit/  Wavefunction/  Superposition/  Orbitals/
   │  ├─ Uncertainty/ Tunneling/     Entanglement/   Applications/
   │  │   each: Scene.tsx (3D) · Controls.tsx (DOM) · index.ts (lazy export)
   ├─ ui/
   │  ├─ ProgressRail.tsx  Section.tsx  GlassCard.tsx  UnderTheHood.tsx  Equation.tsx (KaTeX)
   │  ├─ ExplainToggle.tsx  Slider.tsx  Toggle.tsx  Button.tsx  SettingsMenu.tsx  FpsMeter.tsx (dev)
   ├─ content/  intro.ts doubleSlit.ts … applications.ts
   ├─ hooks/  useReducedMotion.ts  useWorker.ts  useDisposable.ts
   └─ lib/    scroll.ts (GSAP registration)  colors.ts  a11y.ts
```

---

## 3. Ordered build sequence (each step ends with the verification gate)

**Verification gate after every step:** `npm run dev` boots · `npm run typecheck` clean · `npm run lint` clean · `npm test` (physics) green · `npm run e2e` smoke (canvas renders, no console errors, frame-time sample logged) · manual screenshot via headless Chromium · commit with descriptive message · push.

> Note: this container renders WebGL through SwiftShader (software), so headless fps numbers are a _lower bound_ sanity check, not a proof of the 60 fps budget. I'll also log per-frame CPU time and draw calls / triangle counts, which do transfer to real hardware.

0. **Docs & scaffold** — PLAN.md, CLAUDE.md. Vite + React + TS, Tailwind, ESLint/Prettier, Vitest, Playwright smoke. Blank R3F canvas with `#05060a` clear color. Gate: dev boots, blank canvas renders.
1. **App shell** — Section layout + glass cards, ScrollTrigger → nav store, CameraRig with damped flights between 8 stations (placeholder-free: stations show a subtle starfield/nebula backdrop only), ProgressRail (click/keyboard jump, `aria-current`), quality-tier detection + PerformanceMonitor + Settings override, reduced-motion handling, Effects pipeline, SceneWindow lazy mounting. Physics core started here: `complex`, `fft`, `sampling` + tests.
2. **Double slit** — `splitStep2d`, `potentials`, CAP, screen-flux integration, alias sampling (tests: norm conservation, free-packet spreading vs. analytic, fringe spacing ≈ λL/d in far field). Worker precomputes coherent & which-path distributions. Scene: glowing wave field shader, slit wall, instanced detector hits accumulating into the pattern, emission-rate slider, measure toggle, reset. Copy + Under-the-hood.
3. **Wavefunction** — ψ(x,y) surface shader (height = \|ψ\|, hue = arg ψ), \|ψ\|² ghost layer, draggable packet handles (pointer + keyboard), optional evolution. Tests on packet construction/normalization.
4. **Superposition** — `bloch` + tests (Born probs, basis changes, normalization). Draggable state vector, animated amplitude bars, Z/X/Y measurement, outcome histogram vs. prediction, decoherence animation framed as interaction.
5. **Orbitals** — `legendre`, `laguerre`, `sphericalHarmonics`, `hydrogen` + tests (orthonormality by quadrature, ⟨r⟩ = (3n²−l(l+1))/2, E_n = −1/(2n²) via virial/expectation check, node counts n−l−1). Worker point sampling, volumetric point-cloud shader, n/l/m selectors (with validity constraints), cross-section slider.
6. **Uncertainty** — `wavepacket` moments + FFT link (tests: Gaussian Δx·Δp = ½ to 1e-3; non-Gaussians > ½; Parseval). Linked x/p ribbons, squeeze slider, live readout with KaTeX.
7. **Tunneling** — `splitStep1d`, `barrier` (tests: analytic T at known E, V₀, a; E>V₀ resonances T=1 at k₂a = nπ; numerical packet T within tolerance of momentum-averaged analytic T; free-particle Gaussian spreading). Barrier height/width sliders, live T.
8. **Entanglement** — `bell` (tests: E(a,b) = −cos(a−b); seeded CHSH ≈ 2√2 within 3σ; LHV model S ≤ 2 for all tested angles). Separated particles, detector dials, live Bell counter, classical vs quantum comparison bars.
9. **Where it shows up** — four procedural vignettes + closing copy.
10. **Polish & hardening** — a11y audit (axe via Playwright), mobile touch pass, tier tuning, bundle split check, README (setup, architecture, **Assumptions & Simplifications**), final CLAUDE.md update.

Each step is 1–4 commits; nothing proceeds past a red gate.

---

## 4. Accessibility & UX specifics

- All controls are real DOM inputs (range, radio, button) with visible labels + `aria-label`/`aria-describedby`; canvas is `aria-hidden` with a per-section `role="img"`-style text alternative that updates with sim state (e.g. "Interference pattern with 7 bright fringes, 1,240 detections").
- Rail: `<nav>` with ordered list, arrow-key navigation, `aria-current="step"`.
- Every sim: Reset button, sensible defaults, Simple⇄Technical global toggle (persisted).
- Mobile: touch drag on 3D handles via R3F pointer events, `low` tier default on coarse pointers, simplified scenes (smaller grids, fewer points, no DOF/CA).

## 5. Physics-honesty guardrails (enforced in review)

- Measurement framed as interaction/decoherence, never consciousness.
- Every analogy wrapped in an `<Analogy>` component that visibly labels it "Analogy".
- Any approximation → inline `// APPROX:` comment + README "Assumptions & Simplifications" entry. Already anticipated: finite grids & absorbing boundaries; 2D (not 3D) double slit; which-path modeled as full decoherence; precomputed double-slit field replayed in a loop; orbital point clouds are samples (finite N); non-relativistic, spinless hydrogen.

## 6. Decisions I've made (tell me if you want otherwise)

1. **Orbitals** = full hydrogen ψ_nlm (radial × real spherical harmonic) since the brief asks for an _n_ selector; n ≤ 4.
2. **Double slit** uses a real 2D TDSE precomputed in a worker (not a Fraunhofer shortcut), so the near-field wave is genuine; the detector pattern is sampled from the computed flux.
3. **Single canvas + world-space stations** rather than one canvas per section.
4. **No deployment target** assumed; `npm run build` produces a static `dist/` deployable anywhere (Vercel/Netlify/GitHub Pages).
5. Versions: React 19, three 0.18x, R3F 9, drei 10, postprocessing 3, GSAP 3.15 (ScrollTrigger + ScrollToPlugin), Zustand 5, Tailwind 4, KaTeX 0.18, Vite latest, Vitest latest, TypeScript pinned to the newest version the toolchain (typescript-eslint, Vite plugins) supports.
