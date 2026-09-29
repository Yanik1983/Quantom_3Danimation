attribute float aId;
varying vec2 vUv;
varying float vId;

void main() {
  vUv = uv;
  vId = aId;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
