// Two coherent point sources: ψ = Σ e^{i(k r_j − ω t)} / √r_j  (2D circular waves).
uniform float uTime;
uniform float uK;
uniform float uSep;
varying vec2 vPsi;
varying float vFade;

void main() {
  vec2 p = position.xy;
  float r1 = max(length(p - vec2(-uSep, 0.0)), 0.6);
  float r2 = max(length(p - vec2(uSep, 0.0)), 0.6);
  float w = 1.6;
  float a1 = uK * r1 - w * uTime;
  float a2 = uK * r2 - w * uTime;
  // Interpolate Re/Im (not the phase angle) so the hue never tears where arg ψ wraps at ±π.
  vPsi = vec2(cos(a1), sin(a1)) / sqrt(r1) + vec2(cos(a2), sin(a2)) / sqrt(r2);
  vFade = smoothstep(9.5, 3.0, length(p));
  vec3 pos = vec3(p, vPsi.x * 0.28 * vFade);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
