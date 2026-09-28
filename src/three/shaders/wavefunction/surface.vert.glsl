// ψ surface: height = |ψ|, with a normal from the height field for simple shading.
uniform sampler2D uPsi;
uniform float uHeight;
uniform vec2 uTexel;
uniform float uSize;
varying vec2 vUv;
varying vec3 vNormal;
varying float vAmp;

float amp(vec2 uv) {
  return length(texture2D(uPsi, uv).rg);
}

void main() {
  vUv = uv;
  float a = amp(uv);
  vAmp = a;
  // Height-field normal by central differences (plane lies in local xy; z is up).
  float hx = (amp(uv + vec2(uTexel.x, 0.0)) - amp(uv - vec2(uTexel.x, 0.0))) * uHeight;
  float hy = (amp(uv + vec2(0.0, uTexel.y)) - amp(uv - vec2(0.0, uTexel.y))) * uHeight;
  float step = 2.0 * uTexel.x * uSize;
  vNormal = normalize(normalMatrix * normalize(vec3(-hx / step, -hy / step, 1.0)));
  vec3 pos = position;
  pos.z += uHeight * a;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
