uniform sampler2D uPsi;
uniform float uAmpRef;
varying vec2 vUv;
varying vec3 vNormal;
varying float vAmp;

#include <phaseColor>

void main() {
  vec2 psi = texture2D(uPsi, vUv).rg;
  float t = clamp(length(psi) / uAmpRef, 0.0, 1.5);
  vec3 hue = phaseColor(atan(psi.y, psi.x));
  // View-space lighting: a key light from above-front plus a rim for silhouette.
  vec3 n = normalize(vNormal);
  float key = clamp(dot(n, normalize(vec3(0.3, 0.8, 0.6))), 0.0, 1.0);
  float rim = pow(1.0 - clamp(abs(n.z), 0.0, 1.0), 2.0);
  vec3 col = hue * (0.22 + 0.62 * key + 0.35 * rim);
  // Where |ψ| ≈ 0 the sheet is almost invisible (a faint reference grid), so the
  // probability density on the floor shows through.
  vec2 g = abs(fract(vUv * 24.0) - 0.5);
  float grid = smoothstep(0.47, 0.5, max(g.x, g.y));
  float body = smoothstep(0.03, 0.3, t);
  float alpha = max(body * 0.88, grid * 0.07);
  vec3 outCol = mix(vec3(0.35, 0.5, 0.9), col, body);
  float edge = smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x) * smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
  gl_FragColor = vec4(outCol, alpha * edge);
}
