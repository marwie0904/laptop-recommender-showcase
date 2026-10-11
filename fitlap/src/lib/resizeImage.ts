/** Resizes an image to at most `width` px wide as WebP (never upscales). Browser only. */
export async function toWebp(file: Blob, width: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const w = Math.min(width, bmp.width);
  const h = Math.round((bmp.height * w) / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob || blob.type !== 'image/webp') throw new Error('This browser cannot encode WebP. Use Chrome or Edge for uploads.');
  return { blob, width: w, height: h };
}
