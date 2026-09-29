// Instrument screens. Even screens show Rabi oscillations (a qubit driven between 0 and 1,
// P(1) = sin²(Ωt/2), slowly decaying); odd screens show a two-peak readout histogram.
uniform float uTime;
uniform vec3 uCyan;
uniform vec3 uMagenta;
varying vec2 vUv;
varying float vId;

float gridLines(vec2 p) {
  vec2 q = p * vec2(8.0, 4.0);
  vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
  vec3 col = vec3(0.01, 0.025, 0.035) + uCyan * gridLines(vUv) * 0.05;
  float x = vUv.x;
  // vId is interpolated: round it before testing even/odd.
  float id = floor(vId + 0.5);
  if (mod(id, 2.0) < 0.5) {
    float t = x * 22.0 - uTime * (1.2 + 0.2 * id);
    float y = 0.12 + 0.76 * (0.5 - 0.5 * cos(t) * exp(-x * 1.2));
    float d = abs(vUv.y - y) / fwidth(vUv.y);
    col += uCyan * (1.0 - smoothstep(0.0, 2.2, d)) * 0.9;
  } else {
    float wob = 0.06 * sin(uTime * 2.0 + id);
    float a = exp(-pow((x - 0.3) / 0.07, 2.0)) * (0.55 + wob);
    float b = exp(-pow((x - 0.7) / 0.07, 2.0)) * (0.45 - wob);
    float bars = step(0.5, fract(x * 40.0)) * 0.6 + 0.4;
    col += uCyan * step(vUv.y, 0.08 + 0.8 * a) * bars * 0.55;
    col += uMagenta * step(vUv.y, 0.08 + 0.8 * b) * bars * 0.55;
  }
  gl_FragColor = vec4(col, 1.0);
}
