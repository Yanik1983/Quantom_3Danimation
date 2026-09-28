// Hydrogen orbital point cloud. Positions are in Bohr radii with z as the quantization
// axis; world axes are (x, z, −y) so that z points up.
attribute float aSign;
uniform float uScale;
uniform float uGrow;
uniform float uCut;
uniform float uSize;
uniform float uPixelRatio;
varying float vSign;
varying float vCut;

void main() {
  vec3 p = position * uScale * uGrow;
  vec3 w = vec3(p.x, p.z, -p.y);
  vCut = w.z - uCut;
  vSign = aSign;
  vec4 mv = modelViewMatrix * vec4(w, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (10.0 / -mv.z);
}
