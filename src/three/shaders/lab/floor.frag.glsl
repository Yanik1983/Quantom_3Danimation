// Raised lab floor: square tiles with thin seams, a faint cyan sheen near the tables.
uniform vec3 uColor;
uniform vec2 uCenter;
varying vec2 vXZ;

float grid(vec2 p, float spacing) {
  vec2 q = p / spacing;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float d = length(vXZ - uCenter);
  vec2 tile = floor(vXZ / 1.2);
  vec3 col = vec3(0.009, 0.011, 0.017) * (0.8 + 0.4 * hash(tile));
  float seam = grid(vXZ, 1.2);
  col = mix(col, vec3(0.003, 0.004, 0.007), seam * 0.8);
  col += uColor * seam * 0.025 * exp(-d * d / 300.0);
  col += uColor * 0.012 * exp(-d * d / 90.0);
  float fade = 1.0 - smoothstep(26.0, 44.0, d);
  gl_FragColor = vec4(col, fade);
}
