// Procedural deep-space backdrop, baked ONCE into an equirectangular render target
// (see Backdrop.tsx) — the per-frame cost is a single texture lookup.
// Colours are in linear space (the composer converts to sRGB at the end).
varying vec2 vUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}

float fbm(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 6; i++) {
    s += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}

void main() {
  float lon = (vUv.x - 0.5) * 6.28318530718;
  float lat = (vUv.y - 0.5) * 3.14159265359;
  vec3 d = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));
  vec3 q = d * 2.2;
  float w = fbm(q + fbm(q * 1.3));
  float n = smoothstep(0.42, 0.95, w);
  vec3 violet = vec3(0.258, 0.107, 0.922);
  vec3 cyan = vec3(0.016, 0.776, 1.0);
  vec3 magenta = vec3(1.0, 0.047, 0.497);
  vec3 col = mix(violet, cyan, smoothstep(0.25, 0.8, fbm(q * 0.7 + 4.0)));
  col = mix(col, magenta, smoothstep(0.55, 0.9, fbm(q * 0.9 - 2.0)) * 0.55);
  float band = exp(-pow(d.y * 2.4, 2.0));
  // #05060a in linear space.
  vec3 base = vec3(0.0015, 0.0018, 0.0030);
  gl_FragColor = vec4(base + col * n * n * 0.03 * (0.3 + band), 1.0);
}
