// Live histogram of detections (R) with the quantum prediction (G) as an overlay curve.
uniform sampler2D uHist;
uniform float uShowPrediction;
varying vec2 vUv;

void main() {
  vec2 h = texture2D(uHist, vec2(vUv.x, 0.5)).rg;
  float fill = step(vUv.y, h.r);
  vec3 bar = mix(vec3(0.33, 0.14, 0.78), vec3(0.02, 0.62, 0.9), vUv.y) * 0.9;
  float lineW = 0.035;
  float curve = uShowPrediction * (1.0 - smoothstep(0.0, lineW, abs(vUv.y - h.g)));
  float base = 1.0 - smoothstep(0.0, 0.02, vUv.y);
  vec3 col = bar * fill + vec3(1.0, 0.05, 0.5) * curve * 1.6 + vec3(0.25) * base;
  gl_FragColor = vec4(col, 1.0);
}
