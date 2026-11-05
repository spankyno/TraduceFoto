interface Env {
  // No longer used as fallback. Users must supply their own key.
  // Kept only for type compatibility / future use.
  GEMINI_API_KEY?: string;
}

interface RequestBody {
  image?: string;
  targetLanguage?: string;
}

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (per isolate).
// Works reasonably well on Cloudflare Pages Functions for basic protection.
// For production-grade limits use Cloudflare Rate Limiting rules in the dashboard
// (Security → WAF → Rate limiting rules) in addition to this.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS_PER_IP = 12;
const MAX_REQUESTS_PER_KEY = 20;

type RateEntry = { timestamps: number[] };
const ipRateMap = new Map<string, RateEntry>();
const keyRateMap = new Map<string, RateEntry>();

function isRateLimited(map: Map<string, RateEntry>, id: string, max: number): boolean {
  const now = Date.now();
  let entry = map.get(id);
  if (!entry) {
    entry = { timestamps: [] };
    map.set(id, entry);
  }
  // Drop old timestamps
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (entry.timestamps.length >= max) {
    return true;
  }
  entry.timestamps.push(now);
  return false;
}

// Periodically clean maps to avoid unbounded growth (best-effort)
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  for (const [k, v] of ipRateMap) {
    v.timestamps = v.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (v.timestamps.length === 0) ipRateMap.delete(k);
  }
  for (const [k, v] of keyRateMap) {
    v.timestamps = v.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (v.timestamps.length === 0) keyRateMap.delete(k);
  }
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB decoded

const ALLOWED_ORIGINS = [
  'https://traducefoto.pages.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-gemini-api-key',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

export const onRequestOptions = async (context: {
  request: Request;
}): Promise<Response> => {
  const origin = context.request.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request } = context;
  const origin = request.headers.get('Origin');

  // ------------------------------------------------------------------
  // 1. Rate limiting by IP
  // ------------------------------------------------------------------
  maybeCleanup();
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  if (isRateLimited(ipRateMap, clientIp, MAX_REQUESTS_PER_IP)) {
    return jsonResponse(
      {
        success: false,
        error:
          'Demasiadas solicitudes desde tu IP. Espera un minuto e inténtalo de nuevo.',
      },
      429,
      origin
    );
  }

  // ------------------------------------------------------------------
  // 2. Require client-provided API key (NO server-side fallback)
  // ------------------------------------------------------------------
  const apiKey =
    request.headers.get('x-gemini-api-key')?.trim() ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    '';

  if (!apiKey) {
    return jsonResponse(
      {
        success: false,
        requiresApiKey: true,
        error:
          'No se ha configurado ninguna clave de API. Por favor, pulsa en Ajustes (icono ⚙️) e introduce tu GEMINI API KEY.',
      },
      401,
      origin
    );
  }

  // Rate limit also by API key (prevents a single key from being abused)
  // Use a short hash of the key so we don't store full keys in memory
  const keyId = apiKey.slice(0, 12) + '…' + apiKey.slice(-4);
  if (isRateLimited(keyRateMap, keyId, MAX_REQUESTS_PER_KEY)) {
    return jsonResponse(
      {
        success: false,
        error:
          'Has alcanzado el límite de solicitudes para esta clave de API. Espera un minuto.',
      },
      429,
      origin
    );
  }

  try {
    const body = (await request.json()) as RequestBody;
    const { image, targetLanguage = 'Español' } = body;

    if (!image || typeof image !== 'string') {
      return jsonResponse(
        {
          success: false,
          error: 'No se ha proporcionado ninguna imagen para procesar.',
        },
        400,
        origin
      );
    }

    // ------------------------------------------------------------------
    // 3. Strict size limit (8 MB decoded)
    // ------------------------------------------------------------------
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch && mimeMatch[1]) {
        mimeType = mimeMatch[1];
      }
      base64Data = parts[1];
    }

    // Approximate decoded size: base64 length * 3/4
    const estimatedBytes = Math.floor((base64Data.length * 3) / 4);
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return jsonResponse(
        {
          success: false,
          error: `La imagen es demasiado grande (${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB). El límite es 8 MB.`,
        },
        413,
        origin
      );
    }

    // Optional: reject non-image mime types
    if (!mimeType.startsWith('image/')) {
      return jsonResponse(
        {
          success: false,
          error: 'El archivo enviado no es una imagen válida.',
        },
        400,
        origin
      );
    }

    // Basic sanitisation of targetLanguage (prevent prompt injection)
    const safeTargetLanguage = String(targetLanguage)
      .slice(0, 60)
      .replace(/[^\p{L}\p{N}\s\-]/gu, '')
      .trim() || 'Español';

    const promptText = `
Eres un asistente experto en reconocimiento óptico de caracteres (OCR) y traducción multilingüe inmediata para una aplicación móvil.
Analiza detenidamente la imagen capturada por la cámara del usuario:
1. Identifica y extrae con alta precisión TODO el texto visible (letreros, menús, etiquetas, pantallas, documentos, envases, notas manuscritas o impresas).
2. Detecta automáticamente el idioma de origen del texto.
3. Traduce fielmente y de manera natural todo el texto extraído al idioma objetivo: "${safeTargetLanguage}".
   - Si el texto original ya está en el idioma objetivo ("${safeTargetLanguage}"), indícalo claramente y mantén la transcripción original limpia.
4. Si la imagen NO contiene texto legible ni discernible, establece hasText en falso y proporciona un mensaje claro y amable invitando a enfocar de más cerca.
5. Devuelve la respuesta estrictamente en el formato JSON estructurado especificado.
`;

    const requestPayload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            hasText: {
              type: 'BOOLEAN',
              description:
                'Verdadero si hay texto legible en la imagen, falso si no hay texto.',
            },
            detectedLanguage: {
              type: 'STRING',
              description:
                'Nombre del idioma detectado en español (ej. Inglés, Francés, Alemán, Japonés, Italiano, Ruso, etc.).',
            },
            detectedLanguageCode: {
              type: 'STRING',
              description:
                'Código ISO de 2 letras del idioma detectado (ej. en, fr, de, ja, es).',
            },
            originalText: {
              type: 'STRING',
              description:
                'Transcripción completa del texto original encontrado en la foto.',
            },
            translatedText: {
              type: 'STRING',
              description:
                'Traducción completa, fluida y natural al idioma destino.',
            },
            targetLanguage: {
              type: 'STRING',
              description: 'Idioma de destino solicitado (ej. Español).',
            },
            confidence: {
              type: 'STRING',
              description:
                'Nivel de confianza de la detección: alta, media, o baja.',
            },
            summary: {
              type: 'STRING',
              description:
                'Breve frase resumen o título explicativo del texto traducido para lectura rápida.',
            },
          },
          required: [
            'hasText',
            'detectedLanguage',
            'originalText',
            'translatedText',
            'targetLanguage',
          ],
        },
      },
    };

    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-flash-latest',
    ];
    let lastError: string | null = null;
    let responseText: string | undefined;

    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'FotoTraductor/1.0',
              },
              body: JSON.stringify(requestPayload),
            }
          );

          if (!geminiRes.ok) {
            const errBody = await geminiRes.text();
            lastError = `Status ${geminiRes.status}: ${errBody}`;
            if (geminiRes.status === 503 || geminiRes.status === 429) {
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * (attempt + 1))
              );
              continue;
            } else {
              break;
            }
          }

          const geminiJson: any = await geminiRes.json();
          const candidate = geminiJson.candidates?.[0];
          responseText = candidate?.content?.parts?.[0]?.text;

          if (responseText) {
            break;
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      if (responseText) {
        break;
      }
    }

    if (!responseText) {
      if (lastError && lastError.includes('503')) {
        throw new Error(
          'Los servidores de Google AI tienen alta demanda en este momento. Por favor, pulsa en Reintentar en unos segundos.'
        );
      }
      // Do not leak full Gemini error details to the client
      const friendly =
        lastError && lastError.includes('API key not valid')
          ? 'La clave de API de Gemini no es válida. Revisa tu clave en Ajustes.'
          : lastError && lastError.includes('429')
            ? 'Has excedido el límite de la API de Gemini. Espera un momento.'
            : 'No se pudo obtener una respuesta del modelo. Inténtalo de nuevo.';
      throw new Error(friendly);
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      throw new Error('Respuesta del modelo en formato inesperado.');
    }

    return jsonResponse(
      {
        success: true,
        data: parsedData,
      },
      200,
      origin
    );
  } catch (err: any) {
    return jsonResponse(
      {
        success: false,
        error: `Error al procesar la traducción: ${err?.message || 'Error desconocido'}`,
      },
      500,
      origin
    );
  }
};
