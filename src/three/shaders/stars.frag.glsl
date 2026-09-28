varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.0, d);
  float glow = core * core;
  gl_FragColor = vec4(vColor * glow * vTwinkle, glow);
}
