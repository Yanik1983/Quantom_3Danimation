# Quantum Lab: quantum physics, simply explained

An interactive 3D lab with four hands-on experiments that explain quantum physics from the basics. Pick a table in the
glowing lab, the camera glides over, and a short card explains what you are seeing, with two or three controls to try.
Equations are tucked away behind **Learn more**.

| #   | Experiment               | What you do                                                                         | Real physics underneath                                                                      |
| --- | ------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | What is quantum physics? | Zoom from a grain of sand to one atom; fire particles at two slits; watch the slits | 2D split-step Fourier Schrödinger solve in a worker; Born-sampled hits; which-path detectors |
| 2   | Superposition            | Set the left/right mix; Look; Look 100 times                                        | Two-state system; every look is a Born-rule sample, P = \|b\|²                               |
| 3   | Qubits                   | Tilt the Bloch arrow; Measure; 1–4 qubits with 2, 4, 8, 16 possibilities            | Bloch sphere; product-state probabilities over 2ⁿ outcomes                                   |
| 4   | Entanglement             | Measure a pair; measure 100 pairs                                                   | Singlet state, joint outcome sampled at detection; always opposite, each side random         |

The opening screen explains what quantum physics is; after all four experiments the lab shows a closing line.

## Setup

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run lint
npm test           # physics, engine and copy unit tests (Vitest)
npm run e2e        # production build + Playwright: behaviour per experiment + axe accessibility audit
npm run build      # static site in dist/
```

Playwright uses Chromium; set `PW_CHROMIUM` to a local Chromium binary if it is not at `/opt/pw-browsers/chromium`.

URL flags: `?debug` shows an fps / draw-call overlay; `?fx=0` disables post-processing; `?sky=0` disables the starry
backdrop. Links such as `/#qubits` open an experiment directly, and the browser's Back button returns to the lab.

## Deploying (GitHub Pages)

`.github/workflows/deploy-pages.yml` typechecks, lints and tests, then builds with `BASE_PATH=/<repo>/` and publishes
`dist/` to GitHub Pages on every push to the default branch (or on demand from the Actions tab). One-time setup:
**Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is served at
`https://<owner>.github.io/<repo>/`.

For any other static host, `npm run build` (base `/`) or `BASE_PATH=/sub/path/ npm run build`.

## Performance

- Budgets: 60 fps on a 2020-era laptop, ≥ 30 fps on mid-range phones. The double-slit solve runs once in a Web Worker
  (2–4 s, started as the lab loads) and is cached; render loops allocate nothing (preallocated buffers, ring buffers,
  partial GPU uploads, instanced meshes and GPU points).
- All four models stay mounted so the lab shows them working; each is small. Every GPU resource is created through
  `useDisposable`.
- Adaptive quality tiers (`low / medium / high`) from GPU hints and frame timing, with a manual override in Settings.
- CI renders WebGL in software (SwiftShader), where frame rates are far lower than on a GPU; check real devices with
  `?debug`.

## Accessibility

Everything in the 3D room has a DOM equivalent: the experiment menu (large tiles on phones), labelled sliders,
switches and buttons. Each experiment has a text description of its model, and measurement results are announced in
live regions. Opening an experiment moves focus to its title; returning to the lab puts focus back on its menu entry.
Colours meet WCAG AA contrast (checked by axe in e2e). `prefers-reduced-motion` turns camera glides into cuts, with a
manual override in Settings.

## Architecture

```
DOM (React + Tailwind)     lab overlay (welcome + menu), experiment card (text, controls, Learn more), settings
   │  Zustand lab store ──▶ open experiment, visited set; synced with the URL hash / history
   ▼
One R3F <Canvas>           lab room (floor, light columns, four tables); LabCamera glides between the overview
                           and each table's close-up; post-processing (bloom, vignette, CA, flight DOF)
   ▲
Web Worker                 the 2D Schrödinger solve for the double slit
   ▲
src/physics                pure, dependency-free, unit-tested TypeScript
```

- **`src/physics/`**: FFT, split-step Fourier solver, potentials and absorbers, the double-slit run, Bloch-sphere
  measurement, n-qubit product states, the singlet (Bell) model, alias sampling, seeded RNG. No React / three imports
  (ESLint enforces this).
- **`src/scenes/<Name>/`**: `Scene.tsx` (the model on its table; idles in the lab, interactive when open),
  `Controls.tsx`, a Zustand store, and any pure per-frame engine with tests. Registered in `src/scenes/registry.ts`.
- **`src/three/`**: canvas root, lab room (`Lab.tsx`), table layout and camera poses (`tables.ts`), `LabCamera`,
  backdrop, effects, shaders.
- **`src/content/experiments.ts`**: all copy. A test checks lengths, renders every equation with KaTeX, and rejects
  consciousness-causes-collapse phrasing.

## Assumptions & Simplifications

Each item is also marked `APPROX:` or explained inline in the code.

1. **Units.** The double-slit simulation uses ℏ = m = 1; lengths and times are in these natural units.
2. **Double slit is two-dimensional.** Real slits are long in the third dimension, so a 2D (x, y) simulation captures
   the physics. Dots are scattered vertically on the screen to draw the stripes.
3. **Absorbing mask and boundaries.** The slit mask and box edges are complex absorbing potentials rather than
   infinitely hard walls (a very tall real barrier is under-resolved by split-step on a finite grid and leaks).
4. **ψ_both ≈ ψ₁ + ψ₂.** Only the upper-slit wave is simulated; the lower-slit wave is its mirror image. This neglects
   near-field coupling between the apertures (Kirchhoff approximation) and agrees with a direct two-slit run within 5%.
5. **Ideal which-path detectors.** Watching the slits uses perfectly distinguishing detectors, so the stripes vanish
   completely; partial which-path information would fade them gradually.
6. **Geometry trade-off.** Narrow slits give crisp stripes; with detectors on, the two single-slit patterns overlap
   into one smooth band (hits are colour-coded by slit).
7. **Precomputed, replayed wavefunction.** The solve runs once per session; each particle replays the stored
   ψ(x, y, t) at 224 × 96 × ~60 resolution. A detection is registered when half the probability has crossed the
   screen. The firing rate ramps up so single dots are visible first and the pattern builds within seconds.
8. **Zoom lens.** The lens spans six powers of ten (a 0.1 mm grain of fine sand to a 0.1 nm atom). The size label is
   exact; the three pictures (grain, crystal of atoms, one atom) blend into each other and are not to scale in
   between. The crystal is a simplified square array with two kinds of atom (like silicon and oxygen in quartz). The
   single atom is hydrogen: its cloud samples the exact 1s radial density 4r²e^{−2r}.
9. **Superposition as two boxes.** The particle is modelled as an ideal two-state system (left, right); the glowing
   cloud's brightness in each box is the probability, not a simulated spatial wavefunction. "Look" is an idealized
   projective measurement.
10. **Qubits are unentangled.** Several qubits are prepared in the same single-qubit state, so the register is a
    product state and its 2ⁿ outcome probabilities are products. The slow turn of the arrow about the vertical is the
    phase (as in Larmor precession); it does not change the 0/1 odds.
11. **Idealized entanglement.** Detectors are perfect, both measure along the same axis, and there is no loss or
    noise. The Bell-test argument (different angles) is described in Learn more rather than simulated.
12. **Half-float display.** ψ is uploaded to the GPU as 16-bit floats; the physics runs in 64-bit.
13. **Colour wheel.** In the double slit, phase is shown by a cyan → violet → magenta cycle, a display choice with no
    physical meaning of its own.
