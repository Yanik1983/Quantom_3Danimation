// Exact ψ on the cross-section plane: brightness ∝ |ψ|², hue = sign of ψ.
uniform sampler2D uPsi;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float v = texture2D(uPsi, vUv).r;
  float rho = v * v;
  float glow = 1.0 - exp(-6.0 * rho);
  vec3 col = v >= 0.0 ? vec3(0.016, 0.776, 1.0) : vec3(1.0, 0.047, 0.497);
  // Nodal lines (ψ = 0) show as dark seams; a faint frame marks the plane itself.
  vec2 e = min(vUv, 1.0 - vUv);
  float frame = 1.0 - smoothstep(0.0, 0.006, min(e.x, e.y));
  vec3 outCol = col * glow * 1.1 + vec3(0.25, 0.3, 0.55) * frame;
  gl_FragColor = vec4(outCol, (0.35 + 0.65 * glow + frame) * uOpacity);
}
