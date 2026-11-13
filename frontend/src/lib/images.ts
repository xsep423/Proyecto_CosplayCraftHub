/**
 * Tipos que acepta el backend. Con esta lista, iPhone convierte HEIC a JPEG al elegir la foto.
 */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const MAX_SIDE = 2400;          // el servidor la deja en 1600; esto solo aligera la subida
const SKIP_BELOW = 1.5 * 1024 * 1024;

/**
 * Reduce en el navegador las fotos pesadas (típico de celular) antes de subirlas.
 * Las pequeñas y los GIF se envían tal cual. Si algo falla, se sube el original.
 */
export async function prepareImage(file: File): Promise<File> {
  if (file.size < SKIP_BELOW || file.type === 'image/gif' || !file.type.startsWith('image/')) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, 0.9));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg');
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}

/** FormData con la imagen ya preparada y campos extra. */
export async function imageForm(file: File, fields: Record<string, string> = {}): Promise<FormData> {
  const form = new FormData();
  form.append('file', await prepareImage(file));
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  return form;
}
