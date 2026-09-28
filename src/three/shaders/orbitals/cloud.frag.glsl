uniform float uAlpha;
varying float vSign;
varying float vCut;

void main() {
  if (vCut > 0.0) discard; // in front of the cross-section plane
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * uAlpha;
  // Sign of ψ: cyan where ψ > 0, magenta where ψ < 0 (brand accents in linear space).
  vec3 col = vSign > 0.0 ? vec3(0.016, 0.776, 1.0) : vec3(1.0, 0.047, 0.497);
  gl_FragColor = vec4(col * a, a);
}
