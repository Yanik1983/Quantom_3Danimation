uniform float uTime;
uniform float uPixelRatio;
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
varying vec3 vColor;
varying float vTwinkle;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float twinkle = 0.75 + 0.25 * sin(uTime * (0.6 + aPhase) + aPhase * 40.0);
  vTwinkle = twinkle;
  vColor = aColor;
  gl_PointSize = clamp(aSize * uPixelRatio * (420.0 / -mv.z), 1.0, 6.0 * uPixelRatio);
}
