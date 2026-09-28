uniform vec3 uColor;
uniform vec2 uCenter;
varying vec2 vXZ;

// Anti-aliased grid lines of the given spacing (1 on a line, 0 between).
float grid(vec2 p, float spacing) {
  vec2 q = p / spacing;
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
  float d = length(vXZ - uCenter);
  float fade = exp(-d * d / 420.0);
  float lines = grid(vXZ, 1.0) * 0.22 + grid(vXZ, 4.0) * 0.55;
  vec3 col = uColor * lines * 0.55 + vec3(0.012, 0.016, 0.04);
  gl_FragColor = vec4(col, fade);
}
