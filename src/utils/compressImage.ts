/**
 * Client-side image compression & resizing using Canvas API.
 * Reduces modern phone photos (5–12 MB, 4K+) to a manageable size
 * before sending them to the translation API.
 */

export interface CompressOptions {
  /** Maximum length of the longest side in pixels (default 1280) */
  maxSize?: number;
  /** JPEG/WebP quality 0–1 (default 0.82) */
  quality?: number;
  /** Preferred output mime type */
  mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_MAX_SIZE = 1280;
const DEFAULT_QUALITY = 0.82;

/**
 * Load an image from a data-URL, File or Blob.
 */
function loadImage(source: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Revoke object URL if we created one
      if (typeof source !== 'string' && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para comprimir.'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Detect basic WebP support.
 */
function supportsWebP(): boolean {
  try {
    const c = document.createElement('canvas');
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Resize & compress an image.
 * Returns a data-URL (JPEG or WebP).
 */
export async function compressImage(
  source: string | File | Blob,
  options: CompressOptions = {}
): Promise<string> {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const quality = options.quality ?? DEFAULT_QUALITY;
  let mimeType = options.mimeType ?? 'image/jpeg';

  if (mimeType === 'image/webp' && !supportsWebP()) {
    mimeType = 'image/jpeg';
  }

  const img = await loadImage(source);

  let { width, height } = img;

  // Only downscale – never upscale
  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo crear el contexto de canvas.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL(mimeType, quality);
}

/**
 * Convenience helper that accepts a data-URL and returns a compressed
 * data-URL. If compression fails it returns the original string.
 */
export async function compressDataUrl(
  dataUrl: string,
  options?: CompressOptions
): Promise<string> {
  try {
    return await compressImage(dataUrl, options);
  } catch (err) {
    console.warn('compressDataUrl fallback to original:', err);
    return dataUrl;
  }
}
