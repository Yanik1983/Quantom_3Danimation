uniform sampler2D uMap;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  vec2 uv = vec2(atan(d.x, d.z) / 6.28318530718 + 0.5, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
  gl_FragColor = vec4(texture2D(uMap, uv).rgb, 1.0);
}
