// Glass Bloch sphere: fresnel rim plus latitude/longitude lines every 30°.
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;

float gridLine(float coord, float count) {
  float c = coord * count;
  float d = abs(fract(c + 0.5) - 0.5); // distance to the nearest line, in cells
  return 1.0 - smoothstep(0.0, 1.5 * fwidth(c), d);
}

void main() {
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  float lon = gridLine(vUv.x, 12.0);
  float lat = gridLine(vUv.y, 6.0);
  float equator = 1.0 - smoothstep(0.0, 0.004 + fwidth(vUv.y) * 1.5, abs(vUv.y - 0.5));
  vec3 cyan = vec3(0.133, 0.894, 1.0);
  vec3 violet = vec3(0.545, 0.361, 0.965);
  vec3 col = cyan * fres * 0.55 + violet * max(lon, lat) * 0.22 + cyan * equator * 0.5;
  gl_FragColor = vec4(col, 1.0);
}
