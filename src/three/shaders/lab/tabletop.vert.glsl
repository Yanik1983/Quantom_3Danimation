varying vec2 vUv2;

void main() {
  vUv2 = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
