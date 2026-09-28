#include <doubleSlitCommon>
#include <phaseColor>

varying vec2 vUv;

void main() {
  vec2 st = vec2(vUv.y, vUv.x);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 4; i++) {
    if (uW[i] <= 0.0) continue;
    vec2 p = psiAt(st, uT[i], uBranch[i]);
    // Hue = phase, brightness = amplitude (√ soft-knee so the diffracted wave stays visible).
    // Different particles never interfere with each other: their intensities add.
    col += phaseColor(atan(p.y, p.x)) * sqrt(length(p)) * 0.85 * uW[i];
  }
  // Faint lab-floor grid for depth, fading toward the plane's edges.
  vec2 g = abs(fract(vUv * vec2(28.0, 32.0)) - 0.5);
  float line = smoothstep(0.46, 0.5, max(g.x, g.y));
  float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x) * smoothstep(0.0, 0.06, vUv.y);
  gl_FragColor = vec4((col + vec3(0.012, 0.02, 0.04) * line) * edge, 1.0);
}
