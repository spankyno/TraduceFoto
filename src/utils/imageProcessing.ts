/**
 * Preprocesado de imágenes en el navegador (Canvas API).
 *
 * Una foto de móvil moderno pesa entre 5 y 12 MB (4K+). Para OCR/traducción no
 * hace falta esa resolución: se reduce a MAX_IMAGE_DIMENSION px (lado largo) y se
 * comprime a WebP (o JPEG si el navegador no sabe codificar WebP) ANTES de subirla.
 * Resultado típico: 150-500 KB en lugar de varios MB -> subida y respuesta mucho
 * más rápidas, menos cuota consumida y menos memoria en el móvil.
 *
 * Además:
 *  - respeta la orientación EXIF (fotos de galería hechas en vertical),
 *  - aplana la transparencia sobre blanco (evita fondos negros al pasar a JPEG),
 *  - rasteriza SVG (las "fotos de prueba"), que Gemini no admite como entrada.
 */

/** Lado largo máximo. 1280 mantiene legible el texto pequeño; 1024 sería más agresivo. */
export const MAX_IMAGE_DIMENSION = 1280;

const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.82;
const MIN_QUALITY = 0.5;
/** Si tras comprimir pesa más que esto, se baja la calidad progresivamente. */
const TARGET_MAX_BYTES = 900 * 1024;
/** Evita intentar decodificar ficheros absurdamente grandes en móviles modestos. */
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

export interface PreparedImage {
  dataUrl: string;
  mimeType: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  /** Tamaño del fichero ya comprimido, en bytes. */
  bytes: number;
}

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

const DECODE_ERROR =
  'No se pudo leer la imagen. Prueba con una foto JPEG, PNG o WebP.';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height)); // nunca amplía
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * canvas.toBlob con un tipo no soportado devuelve PNG en silencio (p. ej. Safari
 * con WebP). Se comprueba una vez qué formato produce realmente el navegador.
 */
let webpEncodeSupported: boolean | undefined;
async function supportsWebpEncode(): Promise<boolean> {
  if (webpEncodeSupported !== undefined) return webpEncodeSupported;
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const blob = await canvasToBlob(probe, 'image/webp', WEBP_QUALITY);
  webpEncodeSupported = blob?.type === 'image/webp';
  return webpEncodeSupported;
}

async function encodeCanvas(canvas: HTMLCanvasElement) {
  const webp = await supportsWebpEncode();
  const mimeType = webp ? ('image/webp' as const) : ('image/jpeg' as const);
  let quality = webp ? WEBP_QUALITY : JPEG_QUALITY;

  let blob = await canvasToBlob(canvas, mimeType, quality);
  while (blob && blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.12);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }
  if (!blob) throw new ImageProcessingError('No se pudo comprimir la imagen.');
  return { blob, mimeType };
}

/** Dibuja la fuente escalada en un canvas y la codifica. Núcleo común de todo el módulo. */
async function drawAndEncode(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  mirror = false
): Promise<PreparedImage> {
  const { width, height } = fitWithin(sourceWidth, sourceHeight, MAX_IMAGE_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new ImageProcessingError('Tu navegador no permite procesar imágenes.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, width, height);

  try {
    const { blob, mimeType } = await encodeCanvas(canvas);
    const dataUrl = await blobToDataUrl(blob);
    return { dataUrl, mimeType, width, height, bytes: blob.size };
  } finally {
    // Libera la memoria del bitmap cuanto antes (importante en móviles)
    canvas.width = canvas.height = 0;
  }
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decodeWithImageElement(src: string, revoke?: () => void): Promise<DecodedImage> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  try {
    await img.decode();
  } catch {
    revoke?.();
    throw new ImageProcessingError(DECODE_ERROR);
  }
  return {
    source: img,
    // Un SVG sin tamaño intrínseco reporta 0
    width: img.naturalWidth || 1024,
    height: img.naturalHeight || 768,
    release: () => revoke?.(),
  };
}

async function decodeBlob(blob: Blob): Promise<DecodedImage> {
  // createImageBitmap aplica la orientación EXIF y decodifica fuera del hilo principal.
  if (blob.type !== 'image/svg+xml' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'from-image',
      } as unknown as ImageBitmapOptions);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Cae al <img> (p. ej. SVG, o formatos que createImageBitmap no acepta)
    }
  }
  const url = URL.createObjectURL(blob);
  return decodeWithImageElement(url, () => URL.revokeObjectURL(url));
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** Foto elegida de la galería / selector de ficheros. */
export async function prepareImageFromFile(file: Blob): Promise<PreparedImage> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageProcessingError('La imagen es demasiado grande (máximo 40 MB).');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new ImageProcessingError('El archivo seleccionado no es una imagen.');
  }

  const decoded = await decodeBlob(file);
  try {
    return await drawAndEncode(decoded.source, decoded.width, decoded.height);
  } finally {
    decoded.release();
  }
}

/** Imagen ya en forma de data URL (p. ej. las fotos de prueba en SVG). */
export async function prepareImageFromDataUrl(dataUrl: string): Promise<PreparedImage> {
  // Se decodifica con <img>, no con fetch(): la CSP (connect-src 'self') bloquea fetch de data:
  const decoded = await decodeWithImageElement(dataUrl);
  try {
    return await drawAndEncode(decoded.source, decoded.width, decoded.height);
  } finally {
    decoded.release();
  }
}

/**
 * Fotograma actual del <video> de la cámara. Se dibuja ya reducido (sin pasar
 * por un canvas a resolución completa 4K), espejado si es la cámara frontal.
 */
export async function prepareImageFromVideo(
  video: HTMLVideoElement,
  mirror = false
): Promise<PreparedImage> {
  if (!video.videoWidth || !video.videoHeight) {
    throw new ImageProcessingError('La cámara aún no está lista. Inténtalo de nuevo.');
  }
  return drawAndEncode(video, video.videoWidth, video.videoHeight, mirror);
}
