attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;

void main() {
  // Most LEDs glow steadily; about a third blink at their own rate.
  float blink = aPhase < 0.35 ? step(0.45, fract(uTime * (0.6 + aPhase * 3.0) + aPhase * 7.0)) : 1.0;
  vColor = aColor * (0.25 + 0.95 * blink);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(uPixelRatio * 90.0 / -mv.z, 1.5, 9.0);
  gl_Position = projectionMatrix * mv;
}
