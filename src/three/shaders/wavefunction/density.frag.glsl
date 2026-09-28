// Born-rule density |ψ|² projected on the floor.
uniform sampler2D uPsi;
uniform float uRhoRef;
varying vec2 vUv;

vec3 ramp(float x) {
  // black → deep blue → cyan → white
  vec3 a = mix(vec3(0.0), vec3(0.05, 0.2, 0.75), smoothstep(0.0, 0.35, x));
  a = mix(a, vec3(0.1, 0.85, 1.0), smoothstep(0.3, 0.75, x));
  return mix(a, vec3(1.0), smoothstep(0.75, 1.0, x));
}

void main() {
  vec2 psi = texture2D(uPsi, vUv).rg;
  float rho = dot(psi, psi) / uRhoRef;
  vec3 col = ramp(1.0 - exp(-2.5 * rho)) * 1.1;
  vec2 g = abs(fract(vUv * 12.0) - 0.5);
  float grid = smoothstep(0.47, 0.5, max(g.x, g.y)) * 0.05;
  float edge = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x) * smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);
  gl_FragColor = vec4((col + vec3(0.2, 0.3, 0.6) * grid) * edge, 1.0);
}
