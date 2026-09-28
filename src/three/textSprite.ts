import { CanvasTexture, SRGBColorSpace } from 'three';

/** A small texture with one centred glyph or word, for labels drawn inside the 3D scene. */
export function textTexture(text: string, color: string, px = 96): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `600 ${px}px "Space Grotesk Variable", "Inter Variable", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, px, px * 1.05);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  return t;
}
