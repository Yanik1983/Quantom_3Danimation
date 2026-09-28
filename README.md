# Quantum, up close

An interactive 3D explainer that teaches quantum physics through real simulations. Scroll through
eight stations; at each one you can manipulate a live 3D experiment before reading what it means.
Every simulation runs genuine quantum mechanics in the browser: split-step Fourier solutions of
the Schrödinger equation, hydrogen eigenfunctions, and Born-rule sampling for every measurement.

## Setup

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run lint
npm test           # physics + engine unit tests (Vitest)
npm run e2e        # production build + Playwright: per-scene behaviour + axe accessibility audit
npm run build      # static site in dist/ (deploy to any static host)
```

Playwright uses Chromium; set `PW_CHROMIUM` to a local Chromium binary if it is not at
`/opt/pw-browsers/chromium`.

URL flags: `?debug` shows an fps / draw-call overlay; `?fx=0` disables post-processing; `?sky=0`
disables the backdrop. Deep links: `/#double-slit`, `/#orbitals`, … jump straight to a section.

## Deploying (GitHub Pages)

`.github/workflows/deploy-pages.yml` typechecks, lints and tests, then builds with
`BASE_PATH=/<repo>/` and publishes `dist/` to GitHub Pages on every push to the default branch
(or on demand from the Actions tab). One-time setup: **Settings → Pages → Build and deployment →
Source: GitHub Actions**. Pages on a private repository requires a paid GitHub plan; otherwise make
the repository public. The site is then served at `https://<owner>.github.io/<repo>/`.

For any other static host, `npm run build` (base `/`) or `BASE_PATH=/sub/path/ npm run build`.

## The eight stations

| #   | Section       | Simulation                                                                          | Key test targets                                                             |
| --- | ------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Double slit   | 2D split-step TDSE (256×128) in a worker; Born-sampled hits; which-path decoherence | fringe positions vs path difference, superposition vs direct run, visibility |
| 2   | Wavefunction  | Editable ψ(x,y) from Gaussian packets; live 2D evolution (harmonic / free)          | coherent-state oscillation, squeezed breathing, ⟨E⟩ conservation             |
| 3   | Superposition | Bloch sphere, Z/X/Y projective measurement                                          | P± = ½(1 ± r·n), 4σ sampling, repeatability                                  |
| 4   | Orbitals      | Exact hydrogen ψ_nlm point clouds + cross-sections                                  | Y_lm orthonormality, ⟨r⟩, ⟨1/r⟩ → E_n, nodes, radial equation                |
| 5   | Uncertainty   | FFT-linked ψ(x) ⇄ φ(p)                                                              | Δx·Δp = ½ for Gaussians, chirp formula, Parseval                             |
| 6   | Tunneling     | 1D split-step scattering off a rectangular barrier                                  | analytic T(E), resonances, simulated T within 0.005                          |
| 7   | Entanglement  | Singlet Bell tests (Mermin & CHSH) vs a hidden-variable model                       | E = −cos Δ, \|S\| = 2√2 vs ≤ 2, 1/2 vs 5/9                                   |
| 8   | Applications  | Oxide tunnelling, Bloch-equation MRI, laser cascade, 3-qubit Grover                 | Larmor & photon energies, Grover sin²((2k+1)θ)                               |

## Performance

- Budgets: 60 fps on a 2020-era laptop, ≥ 30 fps on mid-range phones. Heavy numerics run in
  workers; render loops allocate nothing (preallocated vectors, ring buffers, in-place buffer
  updates with partial GPU uploads); particles are instanced or GPU points.
- Only the active station ± 1 is mounted; every GPU resource is created through `useDisposable`
  and freed on unmount. Deterministic simulation results (e.g. the double-slit solve) are cached
  for the session.
- Vendor code is split into long-lived chunks (three, R3F/postprocessing, KaTeX, GSAP); each
  scene and its controls load on demand.
- CI and the dev container render WebGL in software (SwiftShader), where frame rates are 10–100×
  lower than on a GPU. Real-hardware frame rates should be checked with `?debug` on target
  devices.

## Accessibility

Every 3D manipulation has an equivalent labelled DOM control (sliders, switches, buttons). The
progress rail is keyboard navigable (arrow keys, Home/End). Each section has a text alternative
for its visualization and a polite live region describing the simulation state. The Entanglement
chart has focusable points and a data table. Colours meet WCAG AA contrast, which is checked by axe
in the e2e suite. `prefers-reduced-motion` is honoured, with a manual override in Settings.

**Known limitation:** on touch screens the canvas lets vertical swipes scroll the page, so
dragging 3D handles (packet rings, the Bloch vector) works best with a mouse or pen. The same
parameters are always available through the sliders.

## Architecture

```
DOM (React + Tailwind)          glass cards, progress rail, settings, KaTeX "Under the hood"
   │  GSAP ScrollTrigger ──▶  Zustand nav store (continuous scroll position in "stations")
   ▼
One persistent R3F <Canvas>     CameraRig flies between world-space stations; SceneWindow
                                lazy-mounts only the active station ± 1; post-processing
   ▲
Web Workers                     heavy numerics (e.g. the 2D Schrödinger solve) off the main thread
   ▲
src/physics                     pure, dependency-free, unit-tested TypeScript
```

- **`src/physics/`**: FFT (1D/2D, allocation-free plans), split-step Fourier solvers, potentials and
  absorbing layers, sampling (alias method), seeded RNG. There are no imports from React, three or the
  DOM; ESLint enforces this.
- **`src/workers/`**: runs the physics and sends typed arrays back as transferable buffers.
- **`src/scenes/<Name>/`**: one folder per concept: `Scene.tsx` (3D), `Controls.tsx` (DOM),
  a Zustand store, and any pure per-frame engine (e.g. particle emission) with its own tests.
- **`src/three/`**: canvas root, camera rig, stations, backdrop, post-processing, GLSL shaders.
- **`src/content/`**: the scientific copy (Simple and Technical), analogies, alt text, and
  "Under the hood" equations. A test renders every equation with KaTeX, checks word counts, and
  rejects consciousness-causes-collapse phrasing.
- **Quality tiers** (`low / medium / high`): an initial guess from GPU and device hints, then
  frame-timing feedback (drei `PerformanceMonitor`). There is a manual override in Settings. The
  tier sets DPR, particle counts, mesh density and post-effects.
- **Reduced motion**: camera flights become cuts and rail jumps are instant; simulations stay
  interactive.

## Assumptions & Simplifications

Each item is also marked `APPROX:` or explained inline in the code.

1. **Units.** Wave-packet scenes use ℏ = m = 1. Lengths and times are in these natural units,
   not SI.
2. **Double slit is two-dimensional.** Real slits are long in the third dimension, so a 2D (x, y)
   simulation captures the physics. Dots are scattered vertically on the screen to draw the
   resulting stripes.
3. **Absorbing mask and boundaries.** The slit mask and the edges of the box are complex absorbing
   potentials (a "black" mask) rather than infinitely hard walls. A very tall real barrier is
   under-resolved by split-step on a finite grid and leaks. The absorbers reflect a little, as real
   masks do.
4. **ψ_both ≈ ψ₁ + ψ₂.** Only the upper-slit wave is simulated; the lower-slit wave is its mirror
   image, and the coherent wave is their sum. This neglects near-field coupling between the
   apertures via the mask face (the Kirchhoff approximation). It is validated against a direct
   both-slits simulation, and the patterns agree within 5% (L1).
5. **Ideal which-path detectors.** Detector states are perfectly orthogonal, so interference
   disappears completely. Real partial which-path information would reduce fringe visibility
   gradually.
6. **Geometry trade-off.** The double slit uses narrow slits that give crisp fringes. With
   detectors on, the two single-slit patterns then overlap into one smooth band; separated "two
   bands" would need a near-field geometry in which the fringes themselves fade. Hits are
   colour-coded by the recorded slit so both contributions stay visible.
7. **Precomputed, replayed wavefunction.** The double-slit solve runs once per session in a Web
   Worker (about 2–4 s, started while you read the intro). Each particle's display replays the
   stored ψ(x, y, t) at 224 × 96 × ~60 resolution with linear interpolation in space and time.
   Different particles are drawn with added intensities, since they do not interfere with each
   other.
8. **Detection time.** A detection is registered at the time by which half the probability has
   crossed the screen; the spread in arrival times is not shown.
9. **Probability current.** The screen flux uses the phase gradient between neighbouring grid
   points, which is exact for plane waves with k·Δx < π/2.
10. **Wavefunction box.** The editable ψ lives on a 128 × 128 grid over 20 × 20 units. "Free"
    evolution uses a periodic box, so a packet leaving one edge re-enters at the opposite edge.
    The harmonic bowl (ω = 0.5) keeps packets away from the edges.
11. **Half-float display.** ψ is uploaded to the GPU as 16-bit floats (about 3 significant
    digits). The physics runs in 64-bit; only the picture is quantized.
12. **Colour wheel.** Phase is shown by a cyan → violet → magenta cycle. It is a display choice
    with no physical meaning of its own; only phase differences are observable.
13. **Hydrogen model.** Orbitals are exact non-relativistic eigenfunctions of an infinitely heavy
    nucleus, without spin or fine structure (corrections of order 10⁻⁵ of E_n). The real
    (p_x, d_xy, …) combinations are shown rather than complex e^{imφ} states.
14. **Finite samples and auto-scaling.** Each orbital cloud holds 18 000–70 000 exact samples of
    |ψ|² and is rescaled so that 95% of its probability fills the same volume. Readouts give the
    true size (⟨r⟩ and r₉₅ in Bohr radii). The nucleus marker is drawn vastly larger than a real
    proton (≈10⁻⁵ of the atom).
15. **Tunnelling setup.** The barrier is an ideal rectangle, discretized with fractional edge
    cells so its width is exact. The packet width is fixed (σ = 4, momentum spread ℏ/8), so the
    packet's transmission is close to, but not identical with, the plane-wave T(E). Both are
    shown.
16. **Energy-diagram overlay.** In the tunnelling scene the wave is drawn with its axis at its
    mean energy E, over the potential. Amplitude and energy share the vertical direction but not
    units; this is a standard textbook convention.
17. **Idealized Bell test.** Detectors are perfect, with no losses, noise or detection loophole,
    and settings are drawn from a PRNG. The comparison "hidden instructions" model is one
    specific local model (a shared random angle). Bell's theorem, not the simulation, is what
    shows that _every_ local model obeys the same limits. Detector rings face the viewer; real
    measurement directions are perpendicular to the flight path.
