// Lab walls: dark acoustic panels with seams, a cyan light strip along the skirting,
// fading to darkness towards the (unseen) ceiling.
uniform vec3 uAccent;
uniform float uFloorY;
varying vec3 vPos;
varying vec3 vNormalW;

float line(float x, float spacing) {
  float q = x / spacing;
  return 1.0 - min(abs(fract(q - 0.5) - 0.5) / fwidth(q), 1.0);
}

void main() {
  float u = abs(vNormalW.z) > 0.5 ? vPos.x : vPos.z;
  float h = vPos.y - uFloorY;
  vec3 col = vec3(0.009, 0.011, 0.017);
  float seams = max(line(u, 2.4), max(line(h - 1.2, 3.4) * step(1.0, h), 0.0));
  col *= 1.0 - 0.55 * seams;
  // Pools of light washing up the wall from the room.
  col *= 0.55 + 0.75 * exp(-h * 0.22) + 0.25 * exp(-u * u / 260.0);
  // Skirting light strip.
  float strip = smoothstep(0.05, 0.0, abs(h - 0.1));
  col += uAccent * strip * 0.3 + uAccent * exp(-h * 3.0) * 0.02;
  col *= 1.0 - smoothstep(8.0, 15.0, h);
  gl_FragColor = vec4(col, 1.0);
}
