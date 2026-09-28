uniform vec3 uColor;
uniform float uRadius;
uniform float uGlow;
varying vec2 vUv2;

void main() {
  float r = length(vUv2) / uRadius;
  // Faint concentric rings and a bright inner edge: a lit instrument platform.
  float rings = smoothstep(0.02, 0.0, abs(fract(r * 4.0) - 0.5) - 0.47) * 0.05;
  float edge = smoothstep(0.9, 1.0, r) * 0.16;
  vec3 col = vec3(0.012, 0.015, 0.032) + uColor * (rings + edge) * uGlow;
  gl_FragColor = vec4(col, 1.0);
}
