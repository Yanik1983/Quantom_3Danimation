varying float vFlash;
varying vec3 vColor;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, d);
  // Fresh hits flash brightly in their own colour, then settle to a steady glow.
  vec3 col = vColor * (0.9 + 1.6 * vFlash) + vec3(0.5) * vFlash;
  gl_FragColor = vec4(col * a, a);
}
