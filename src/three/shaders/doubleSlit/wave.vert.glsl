#include <doubleSlitCommon>

uniform float uHeight;
varying vec2 vUv;

void main() {
  vUv = uv;
  // uv.x runs across the beam (sim y), uv.y along propagation (sim x).
  vec2 st = vec2(uv.y, uv.x);
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    if (uW[i] <= 0.0) continue;
    h += psiAt(st, uT[i], uBranch[i]).x * uW[i];
  }
  vec3 pos = position;
  pos.z += uHeight * h;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
