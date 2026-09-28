attribute float aStage;
attribute float aSize;
attribute vec3 aColor;
uniform float uZoom;
uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uCenters;
uniform float uGrowth;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float center = aStage < 0.5 ? uCenters.x : aStage < 1.5 ? uCenters.y : uCenters.z;
  float scale = exp(uGrowth * (uZoom - center));
  // Each picture fades in as it grows into view and out once it overflows the lens.
  float alpha = smoothstep(0.22, 0.5, scale) * (1.0 - smoothstep(1.8, 3.4, scale));

  // Slow turntable spin; the atom's cloud turns a little faster.
  float spin = uTime * (aStage > 1.5 ? 0.35 : 0.15);
  float c = cos(spin);
  float s = sin(spin);
  vec3 p = vec3(c * position.x + s * position.z, position.y, -s * position.x + c * position.z);
  p.xy *= scale;
  p.z *= scale * 0.35;

  // Soft edge: points fade as they approach the rim of the lens.
  alpha *= 1.0 - smoothstep(0.8, 0.98, length(p.xy));
  vAlpha = alpha;
  vColor = aColor;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float grow = aStage < 0.5 ? 1.0 : min(scale, 3.0);
  gl_PointSize = alpha > 0.0 ? aSize * grow * uPixelRatio * (10.0 / -mv.z) : 0.0;
}
