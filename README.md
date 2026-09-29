# Quantum Lab: how a quantum computer works, simply explained

An interactive 3D lab that explains how a quantum computer works, as one short story. The welcome states the goal:
learn three tricks of tiny particles, then use them to find a hidden card in one look (about 5 minutes). **Start**
leads through four steps; each card asks a question, says what to **try**, explains **what you saw** after you try
it, and ends with one line on how a quantum computer uses the idea. Equations are tucked away behind **Learn more**.

| #   | Step (table)            | What you do                                                                         | Real physics underneath                                                                      |
| --- | ----------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Waves that cancel       | Fire particles at two slits; turn on detectors at the slits                         | 2D split-step Fourier Schrödinger solve in a worker; Born-sampled hits; which-path detectors |
| 2   | Qubits: 0 and 1 at once | Set the 0/1 mix; Measure; Measure 100 times; add qubits (1–4 → 2, 4, 8, 16 results) | Two-state systems; product-state probabilities over 2ⁿ outcomes; Born-rule samples           |
| 3   | Linked qubits           | Measure a pair; measure 100 pairs                                                   | Bell state \|Φ⁺⟩, joint outcome sampled at detection; always the same bit, each side random  |
| 4   | Find the card           | Lift cups yourself first; then the quantum computer's Spread, Mark, Cancel, Measure | Grover search on the real 2-qubit state (oracle + diffusion); Born-rule measurement          |

After step 4, **Finish** opens the finale (`#finale`): the three tricks, what quantum computers will be good for, what
they will not do, and a common myth. From there (or by clicking the gold refrigerator, `#computer`) the camera glides
to the real machine and a card explains it.

## Setup

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run lint
npm test           # physics, engine and copy unit tests (Vitest)
npm run e2e        # production build + Playwright: behaviour per step + axe accessibility audit
npm run build      # static site in dist/
```

Playwright uses Chromium; set `PW_CHROMIUM` to a local Chromium binary if it is not at `/opt/pw-browsers/chromium`.

URL flags: `?debug` shows an fps / draw-call overlay; `?fx=0` disables post-processing; `?room=0` hides the lab room
around the tables; `?cam=x,y,z,lookX,lookY,lookZ` pins the camera for close-up screenshots. Links such as `/#qubits` (also `#basics`, `#entanglement`, `#search`, `#finale`, `#computer`) open a view directly, and the browser's Back button returns to the lab.

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
One R3F <Canvas>           lab room (walls, floor, cryostats, racks, four tables); LabCamera glides between the overview
                           and each table's close-up; post-processing (bloom, vignette, CA, flight DOF)
   ▲
Web Worker                 the 2D Schrödinger solve for the double slit
   ▲
src/physics                pure, dependency-free, unit-tested TypeScript
```

- **`src/physics/`**: FFT, split-step Fourier solver, potentials and absorbers, the double-slit run, Bloch-sphere
  measurement, n-qubit product states, Bell pairs (singlet and Φ⁺), alias sampling, seeded RNG. No React / three imports
  (ESLint enforces this).
- **`src/scenes/<Name>/`**: `Scene.tsx` (the model on its table; idles in the lab, interactive when open),
  `Controls.tsx`, a Zustand store, and any pure per-frame engine with tests. Registered in `src/scenes/registry.ts`.
- **`src/three/`**: canvas root, lab room (`Lab.tsx`), table layout and camera poses (`tables.ts`), `LabCamera`,
  `room/` (the quantum-computing lab: procedural cryostats, control racks, walls and floor, with
  physically based metals reflecting a baked lab environment), effects, shaders.
- **`src/content/experiments.ts`** (English) and **`experiments.he.ts`** (Hebrew): all copy. A test checks lengths
  in both languages, renders every equation with KaTeX, and rejects consciousness-causes-collapse phrasing.
- **`src/content/i18n.ts`**: interface strings (buttons, labels, results) per language, plus `useUi()` / `useContent()`.
  The header switch toggles English ⇄ עברית; the choice is saved, and `?lang=he` links open in Hebrew. Hebrew sets
  `dir="rtl"` (the card moves to the right and the camera frames the scene to its left); equations stay left to right,
  and the Heebo font supplies Hebrew letters.

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
8. **Qubits as two boxes.** Each qubit is a particle in box 0 or box 1, an ideal two-state system; the glowing
   cloud's brightness in each box is the probability, not a simulated spatial wavefunction. "Measure" is an idealized
   projective measurement.
9. **Qubits are unlinked in step 2.** Several qubits are prepared in the same mix, so the register is a product state
   and its 2ⁿ outcome probabilities are products; linking comes in step 3.
10. **Idealized entanglement.** The pair is the Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 (the pair quantum computers make
    with a Hadamard and a CNOT). Detectors are perfect, both measure along the same axis, and there is no loss or
    noise. The Bell-test argument (different angles, "not like gloves") is described in words rather than simulated.
11. **Step 1 skips the scale.** The double slit is shown without a sense of size (electrons, about an atom's width in
    wavelength); Learn more mentions it.
12. **Half-float display.** ψ is uploaded to the GPU as 16-bit floats; the physics runs in 64-bit.
13. **Colour wheel.** In the double slit, phase is shown by a cyan → violet → magenta cycle, a display choice with no
    physical meaning of its own.
14. **Ideal 2-qubit Grover search.** The gates are perfect (no noise or decoherence), and the oracle is applied as a
    sign flip on the stored state rather than built from individual gates. The bars show the real amplitudes, sign
    included; with four cups one round gives the card with certainty, and the measurement is still a Born-rule sample.
    The hidden card is chosen at random. In the first round the visitor lifts cups one at a time ("up to 4 tries");
    a normal computer that knows the last cup must hold the card could stop after 3 checks.
