import {
  translate,
  parseModels,
  checkContentLength,
  MAX_BODY_BYTES,
} from '../../shared/translate-core';
import {
  MemoryRateLimiter,
  checkRateLimit,
  sha256Hex,
  type RateLimitBinding,
} from '../../shared/rate-limit';

interface Env {
  /** Lista de modelos separada por comas (opcional). Ver shared/translate-core.ts. */
  GEMINI_MODELS?: string;
  /**
   * Bindings opcionales de Cloudflare Rate Limiting (si tu despliegue los soporta).
   * Sin ellos se usa el limitador en memoria (best effort por isolate).
   */
  RL_IP?: RateLimitBinding;
  RL_KEY?: RateLimitBinding;
}

// Red de seguridad en memoria (por isolate). El límite real: binding o regla WAF.
const ipFallback = new MemoryRateLimiter(60_000, 12);
const keyFallback = new MemoryRateLimiter(60_000, 20);

const ALLOWED_ORIGINS = [
  'https://traducefoto.pages.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// Nota: public/_headers NO se aplica a respuestas de Functions, así que las
// cabeceras de seguridad de la API se fijan aquí.
function json(body: unknown, status: number, origin: string | null, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(origin),
      ...extra,
    },
  });
}

export const onRequestOptions = async (context: { request: Request }): Promise<Response> => {
  const origin = context.request.headers.get('Origin');
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  // 1. Limitación por IP (solo cf-connecting-ip: x-forwarded-for es falsificable)
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
  if (!(await checkRateLimit(env.RL_IP, ipFallback, `ip:${clientIp}`))) {
    return json(
      {
        success: false,
        error: 'Demasiadas solicitudes desde tu IP. Espera un minuto e inténtalo de nuevo.',
      },
      429,
      origin,
      { 'Retry-After': '60' }
    );
  }

  // 2. La clave la aporta el usuario (sin clave de servidor)
  const apiKey = request.headers.get('x-gemini-api-key')?.trim() || '';
  if (!apiKey) {
    return json(
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

  // Limitación por clave: identificador = hash completo (no se guarda la clave)
  const keyId = `key:${await sha256Hex(apiKey)}`;
  if (!(await checkRateLimit(env.RL_KEY, keyFallback, keyId))) {
    return json(
      {
        success: false,
        error: 'Has alcanzado el límite de solicitudes para esta clave de API. Espera un minuto.',
      },
      429,
      origin,
      { 'Retry-After': '60' }
    );
  }

  // 3. Validación del cuerpo ANTES de procesarlo
  if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    return json({ success: false, error: 'Content-Type no soportado.' }, 415, origin);
  }
  const tooBig = checkContentLength(request.headers.get('content-length'));
  if (tooBig) return json(tooBig.body, tooBig.status, origin);

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ success: false, error: 'No se pudo leer la solicitud.' }, 400, origin);
  }
  if (raw.length > MAX_BODY_BYTES) {
    return json(
      { success: false, error: 'La solicitud es demasiado grande. El límite de imagen es 8 MB.' },
      413,
      origin
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ success: false, error: 'JSON no válido.' }, 400, origin);
  }

  // 4. Traducción
  try {
    const result = await translate({ apiKey, body, models: parseModels(env.GEMINI_MODELS) });
    return json(result.body, result.status, origin);
  } catch (err) {
    console.error('[translate] error inesperado', err instanceof Error ? err.name : 'unknown');
    return json(
      { success: false, error: 'Error interno al procesar la traducción. Inténtalo de nuevo.' },
      500,
      origin
    );
  }
};
