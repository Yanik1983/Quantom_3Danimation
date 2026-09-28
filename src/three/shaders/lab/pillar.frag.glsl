uniform vec3 uColor;
varying float vH;

void main() {
  // Bright at the floor, fading upwards.
  float a = pow(1.0 - vH, 2.2) * 0.9;
  gl_FragColor = vec4(uColor * a, a);
}
