attribute vec3 aTint;
attribute float aShine;
varying vec3 vTint;
varying float vShine;
varying vec3 vN;
varying vec3 vV;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - w.xyz;
  vTint = aTint;
  vShine = aShine;
  gl_Position = projectionMatrix * viewMatrix * w;
}
