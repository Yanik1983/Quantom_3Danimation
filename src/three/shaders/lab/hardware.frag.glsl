// Unlit "studio" shading for the lab hardware: a fake environment (a bright ceiling, a dim
// floor, one warm key light) reflected by metals according to their shine. No scene lights.
varying vec3 vTint;
varying float vShine;
varying vec3 vN;
varying vec3 vV;

void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  if (dot(n, v) < 0.0) n = -n;
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(-v, n);

  float diffuse = 0.05 + 0.2 * (0.5 + 0.5 * n.y) + 0.1 * max(0.0, n.z);
  float ceiling = smoothstep(0.35, 0.9, r.y);
  float key = pow(max(0.0, dot(r, normalize(vec3(0.5, 0.45, 0.75)))), 24.0);
  float fresnel = pow(1.0 - ndv, 3.0);

  vec3 col = vTint * diffuse * (1.0 - 0.6 * vShine);
  col += vTint * vShine * (0.06 + 0.4 * ceiling + 0.4 * fresnel);
  col += vec3(1.0, 0.92, 0.8) * key * vShine * 0.55;
  gl_FragColor = vec4(col, 1.0);
}
