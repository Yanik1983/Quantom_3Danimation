attribute float aBirth;
attribute float aBranch;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
varying float vFlash;
varying vec3 vColor;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vFlash = exp(-max(uTime - aBirth, 0.0) * 5.0);
  // No which-path record: cool white-blue. Recorded at the upper slit: cyan; lower: magenta.
  vColor = aBranch < 0.5 ? vec3(0.28, 0.52, 0.95) : aBranch < 1.5 ? vec3(0.05, 0.7, 1.0) : vec3(1.0, 0.16, 0.62);
  gl_PointSize = uSize * (1.0 + 3.0 * vFlash) * uPixelRatio * (12.0 / -mv.z);
}
