// Shared by the double-slit vertex and fragment shaders. The volume holds ψ₁ (upper-slit
// wave) over (x, y, t); ψ₂(x, y) = ψ₁(x, −y) is read by mirroring the transverse coordinate.
precision highp sampler3D;

uniform highp sampler3D uFrames;
uniform float uT[4];
uniform float uW[4];
uniform float uBranch[4];
uniform float uMaskS;

vec2 psiAt(vec2 st, float t, float branch) {
  vec2 a = texture(uFrames, vec3(st, t)).rg;
  if (st.x > uMaskS) {
    vec2 m = texture(uFrames, vec3(st.x, 1.0 - st.y, t)).rg;
    if (branch < 0.5) a += m;          // no which-path record: ψ₁ + ψ₂
    else if (branch > 1.5) a = m;      // registered at the lower slit: ψ₂
  }
  return a;
}
