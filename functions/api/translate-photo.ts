interface Env {
  GEMINI_API_KEY?: string;
}

interface RequestBody {
  image?: string;
  targetLanguage?: string;
  provider?: string;
}

type ProviderStrategy = 'auto' | 'gemini' | 'cloudflare' | 'cloudflare_first';

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000;
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
  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (entry.timestamps.length >= max) return true;
  entry.timestamps.push(now);
  return false;
}

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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
      'Content-Type, Authorization, x-gemini-api-key, x-cf-account-id, x-cf-api-token, x-ai-provider',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null): Response {
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
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
};

// ---------------------------------------------------------------------------
// Gemini helper
// ---------------------------------------------------------------------------
async function callGemini(
  apiKey: string,
  mimeType: string,
  base64Data: string,
  safeTargetLanguage: string
): Promise<{ data: any; provider: string }> {
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
          { inlineData: { mimeType, data: base64Data } },
          { text: promptText },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          hasText: { type: 'BOOLEAN' },
          detectedLanguage: { type: 'STRING' },
          detectedLanguageCode: { type: 'STRING' },
          originalText: { type: 'STRING' },
          translatedText: { type: 'STRING' },
          targetLanguage: { type: 'STRING' },
          confidence: { type: 'STRING' },
          summary: { type: 'STRING' },
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
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          break;
        }

        const geminiJson: any = await geminiRes.json();
        responseText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) break;
      } catch (err: any) {
        lastError = err?.message || String(err);
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    if (responseText) break;
  }

  if (!responseText) {
    if (lastError?.includes('API key not valid') || lastError?.includes('API_KEY_INVALID')) {
      throw new Error('La clave de API de Gemini no es válida.');
    }
    if (lastError?.includes('429')) {
      throw new Error('Cuota de Gemini agotada o rate limit. Prueba Cloudflare o espera.');
    }
    if (lastError?.includes('503')) {
      throw new Error('Servidores de Gemini con alta demanda. Reintenta en unos segundos.');
    }
    throw new Error(lastError || 'Gemini no devolvió respuesta.');
  }

  const parsed = JSON.parse(responseText);
  return { data: parsed, provider: 'gemini' };
}

// ---------------------------------------------------------------------------
// Cloudflare Workers AI helper (vision models)
// ---------------------------------------------------------------------------
async function callCloudflareWorkersAI(
  accountId: string,
  apiToken: string,
  base64Data: string,
  safeTargetLanguage: string
): Promise<{ data: any; provider: string }> {
  // Strong OCR + translation prompt. Models on Workers AI are weaker than Gemini
  // at multilingual OCR, so we are very explicit.
  const prompt = `TASK: Optical Character Recognition (OCR) and translation.

Look carefully at the image. Extract EVERY piece of readable text you can see:
- Titles, headings, body paragraphs
- Addresses, phone numbers, opening hours
- Menu items, labels, buttons, links
- Any other printed or digital text

Rules:
1. Transcribe the original text EXACTLY as written (preserve original language and spelling).
2. Detect the source language (e.g. Polish, English, German, Spanish…).
3. Translate the full text into: ${safeTargetLanguage}.
4. If there is truly no readable text, set hasText to false.

Respond with ONLY a valid JSON object, no markdown, no explanation:
{
  "hasText": true,
  "detectedLanguage": "Polaco",
  "detectedLanguageCode": "pl",
  "originalText": "full original text here",
  "translatedText": "full translation into ${safeTargetLanguage}",
  "targetLanguage": "${safeTargetLanguage}",
  "confidence": "alta",
  "summary": "short one-line summary"
}`;

  // Convert base64 → byte array (most reliable input for CF vision models)
  let imageBytes: number[];
  try {
    const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    imageBytes = Array.from(binary);
  } catch {
    throw new Error('No se pudo decodificar la imagen en base64 para Cloudflare.');
  }

  // Try multiple models / payload shapes
  const attempts: { model: string; body: any }[] = [
    // Llama 3.2 Vision – prompt + image bytes (documented working shape)
    {
      model: '@cf/meta/llama-3.2-11b-vision-instruct',
      body: {
        prompt,
        image: imageBytes,
        max_tokens: 2048,
        temperature: 0.1,
      },
    },
    // Llama 3.2 Vision – messages style with data URI
    {
      model: '@cf/meta/llama-3.2-11b-vision-instruct',
      body: {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2048,
      },
    },
    // Llava classic
    {
      model: '@cf/llava-hf/llava-1.5-7b-hf',
      body: {
        prompt,
        image: imageBytes,
        max_tokens: 1024,
      },
    },
  ];

  let lastError: string | null = null;

  for (const { model, body } of attempts) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = `CF ${model} HTTP ${res.status}: ${errText.slice(0, 280)}`;
        continue;
      }

      const json: any = await res.json();

      // Collect possible text fields from different response shapes
      let text: string | undefined =
        (typeof json?.result === 'string' ? json.result : undefined) ||
        json?.result?.response ||
        json?.result?.description ||
        json?.result?.text ||
        json?.result?.choices?.[0]?.message?.content ||
        json?.result?.choices?.[0]?.text;

      if (!text || typeof text !== 'string' || text.trim().length < 5) {
        lastError = `CF ${model}: respuesta vacía o demasiado corta`;
        continue;
      }

      // Extract JSON object from model output
      let parsed: any;
      try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          throw new Error('no JSON object found');
        }
      } catch {
        // Fallback: treat entire output as original + translated text
        parsed = {
          hasText: true,
          detectedLanguage: 'Desconocido',
          detectedLanguageCode: 'und',
          originalText: text.trim(),
          translatedText: text.trim(),
          targetLanguage: safeTargetLanguage,
          confidence: 'baja',
          summary: text.trim().slice(0, 100),
        };
      }

      // Normalize / fill required fields
      if (typeof parsed.hasText !== 'boolean') {
        parsed.hasText = Boolean(
          (parsed.originalText && String(parsed.originalText).trim()) ||
            (parsed.translatedText && String(parsed.translatedText).trim())
        );
      }
      parsed.detectedLanguage = String(parsed.detectedLanguage || 'Desconocido');
      parsed.detectedLanguageCode = String(parsed.detectedLanguageCode || 'und');
      parsed.originalText = String(parsed.originalText || '').trim();
      parsed.translatedText = String(
        parsed.translatedText || parsed.originalText || ''
      ).trim();
      parsed.targetLanguage = String(parsed.targetLanguage || safeTargetLanguage);
      parsed.confidence = String(parsed.confidence || 'media');
      parsed.summary = String(parsed.summary || parsed.translatedText.slice(0, 80));

      // Reject obviously useless results (e.g. only a few characters)
      if (
        parsed.hasText &&
        parsed.originalText.length < 8 &&
        parsed.translatedText.length < 8
      ) {
        lastError = `CF ${model}: texto extraído demasiado corto`;
        continue;
      }

      return { data: parsed, provider: 'cloudflare' };
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
  }

  throw new Error(
    lastError ||
      'Cloudflare Workers AI no pudo extraer texto útil de la imagen. Prueba con Gemini para mejor OCR multilingüe.'
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request } = context;
  const origin = request.headers.get('Origin');

  maybeCleanup();
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  if (isRateLimited(ipRateMap, clientIp, MAX_REQUESTS_PER_IP)) {
    return jsonResponse(
      {
        success: false,
        error: 'Demasiadas solicitudes desde tu IP. Espera un minuto e inténtalo de nuevo.',
      },
      429,
      origin
    );
  }

  // Credentials from headers
  const geminiKey =
    request.headers.get('x-gemini-api-key')?.trim() ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
    '';
  const cfAccountId = request.headers.get('x-cf-account-id')?.trim() || '';
  const cfApiToken = request.headers.get('x-cf-api-token')?.trim() || '';
  const providerHeader = (request.headers.get('x-ai-provider') || 'auto').toLowerCase();

  const hasGemini = Boolean(geminiKey);
  const hasCf = Boolean(cfAccountId && cfApiToken);

  if (!hasGemini && !hasCf) {
    return jsonResponse(
      {
        success: false,
        requiresApiKey: true,
        error:
          'No se ha configurado ninguna clave de API. Configura Gemini y/o Cloudflare Workers AI en Ajustes (⚙️).',
      },
      401,
      origin
    );
  }

  // Rate limit by whatever key we have
  const rateKey = geminiKey
    ? geminiKey.slice(0, 12) + '…' + geminiKey.slice(-4)
    : cfApiToken.slice(0, 12) + '…' + cfApiToken.slice(-4);
  if (isRateLimited(keyRateMap, rateKey, MAX_REQUESTS_PER_KEY)) {
    return jsonResponse(
      {
        success: false,
        error: 'Has alcanzado el límite de solicitudes para esta clave. Espera un minuto.',
      },
      429,
      origin
    );
  }

  try {
    const body = (await request.json()) as RequestBody;
    const { image, targetLanguage = 'Español' } = body;
    const strategy = (body.provider || providerHeader || 'auto') as ProviderStrategy;

    if (!image || typeof image !== 'string') {
      return jsonResponse(
        { success: false, error: 'No se ha proporcionado ninguna imagen para procesar.' },
        400,
        origin
      );
    }

    let mimeType = 'image/jpeg';
    let base64Data = image;
    if (image.includes(';base64,')) {
      const parts = image.split(';base64,');
      const mimeMatch = parts[0].match(/data:(.*?)$/);
      if (mimeMatch?.[1]) mimeType = mimeMatch[1];
      base64Data = parts[1];
    }

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

    if (!mimeType.startsWith('image/')) {
      return jsonResponse(
        { success: false, error: 'El archivo enviado no es una imagen válida.' },
        400,
        origin
      );
    }

    const safeTargetLanguage =
      String(targetLanguage)
        .slice(0, 60)
        .replace(/[^\p{L}\p{N}\s\-]/gu, '')
        .trim() || 'Español';

    // Build ordered list of providers to try
    const tryOrder: ('gemini' | 'cloudflare')[] = [];
    if (strategy === 'gemini') {
      if (hasGemini) tryOrder.push('gemini');
    } else if (strategy === 'cloudflare') {
      if (hasCf) tryOrder.push('cloudflare');
    } else if (strategy === 'cloudflare_first') {
      if (hasCf) tryOrder.push('cloudflare');
      if (hasGemini) tryOrder.push('gemini');
    } else {
      // auto
      if (hasGemini) tryOrder.push('gemini');
      if (hasCf) tryOrder.push('cloudflare');
    }

    if (tryOrder.length === 0) {
      return jsonResponse(
        {
          success: false,
          requiresApiKey: true,
          error:
            'La estrategia elegida requiere claves que no están configuradas. Revisa Ajustes.',
        },
        401,
        origin
      );
    }

    const errors: string[] = [];
    let result: { data: any; provider: string } | null = null;

    for (const p of tryOrder) {
      try {
        if (p === 'gemini') {
          result = await callGemini(geminiKey, mimeType, base64Data, safeTargetLanguage);
        } else {
          result = await callCloudflareWorkersAI(
            cfAccountId,
            cfApiToken,
            base64Data,
            safeTargetLanguage
          );
        }
        break; // success
      } catch (err: any) {
        errors.push(`${p}: ${err?.message || err}`);
      }
    }

    if (!result) {
      return jsonResponse(
        {
          success: false,
          error: `No se pudo traducir con ningún proveedor. ${errors.join(' | ')}`,
        },
        500,
        origin
      );
    }

    return jsonResponse(
      {
        success: true,
        data: result.data,
        providerUsed: result.provider,
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
