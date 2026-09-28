attribute float aSide;
attribute float aSeed;
uniform float uTime;
uniform float uLeft;
uniform float uRight;
uniform float uPixelRatio;
varying float vAlpha;

void main() {
  // Each point drifts on its own slow orbit: a shimmering cloud, not a solid object.
  vec3 p = position;
  float t = uTime * (0.6 + aSeed * 0.8) + aSeed * 40.0;
  p += 0.06 * vec3(sin(t), cos(t * 1.3), sin(t * 0.7 + 1.0));
  vAlpha = aSide < 0.5 ? uLeft : uRight;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = vAlpha > 0.001 ? (1.6 + 1.4 * aSeed) * uPixelRatio * (9.0 / -mv.z) : 0.0;
}
