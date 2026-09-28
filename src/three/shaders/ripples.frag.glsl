varying vec2 vPsi;
varying float vFade;

#include <phaseColor>

void main() {
  float amp = length(vPsi);
  vec3 col = phaseColor(atan(vPsi.y, vPsi.x));
  float crest = smoothstep(0.1, 1.3, vPsi.x);
  float intensity = (0.06 + 0.5 * crest) * vFade * clamp(amp, 0.0, 1.4);
  gl_FragColor = vec4(col * intensity * 1.5, intensity);
}
