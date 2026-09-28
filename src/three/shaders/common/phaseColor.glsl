// Cyclic phase → colour map through the brand accents: cyan → violet → magenta → cyan.
// Continuous at ±π, so phase wrapping never shows a seam.
vec3 phaseColor(float phase) {
  float t = fract(phase / 6.28318530718 + 0.5);
  vec3 cyan = vec3(0.133, 0.894, 1.0);
  vec3 violet = vec3(0.545, 0.361, 0.965);
  vec3 magenta = vec3(1.0, 0.239, 0.733);
  float s = t * 3.0;
  if (s < 1.0) return mix(cyan, violet, s);
  if (s < 2.0) return mix(violet, magenta, s - 1.0);
  return mix(magenta, cyan, s - 2.0);
}
