import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Strict payload limit aligned with production (slightly above 8 MB base64)
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (local development)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_IP = 12;
const MAX_REQUESTS_PER_KEY = 20;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
  if (entry.timestamps.length >= max) {
    return true;
  }
  entry.timestamps.push(now);
  return false;
}

// Health check – never reveals server-side key presence
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'local-dev',
    requiresClientApiKey: true,
    timestamp: new Date().toISOString(),
  });
});

// Translation API endpoint
app.post('/api/translate-photo', async (req, res) => {
  try {
    // Rate limit by IP
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';

    if (isRateLimited(ipRateMap, clientIp, MAX_REQUESTS_PER_IP)) {
      return res.status(429).json({
        success: false,
        error:
          'Demasiadas solicitudes desde tu IP. Espera un minuto e inténtalo de nuevo.',
      });
    }

    // Require client-provided API key (NO fallback to process.env)
    const authHeader = req.headers.authorization;
    const customHeader = req.headers['x-gemini-api-key'];
    const apiKey =
      (typeof customHeader === 'string' ? customHeader.trim() : '') ||
      (authHeader ? String(authHeader).replace(/^Bearer\s+/i, '').trim() : '');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        requiresApiKey: true,
        error:
          'No se ha configurado ninguna clave de API. Por favor, pulsa en Ajustes (icono ⚙️) e introduce tu GEMINI API KEY.',
      });
    }

    // Rate limit by API key
    const keyId = apiKey.slice(0, 12) + '…' + apiKey.slice(-4);
    if (isRateLimited(keyRateMap, keyId, MAX_REQUESTS_PER_KEY)) {
      return res.status(429).json({
        success: false,
        error:
          'Has alcanzado el límite de solicitudes para esta clave de API. Espera un minuto.',
      });
    }

    const { image, targetLanguage = 'Español' } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'No se ha proporcionado ninguna imagen para procesar.',
      });
    }

    // Clean base64 and extract mimeType
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

    // Strict size limit (8 MB decoded)
    const estimatedBytes = Math.floor((base64Data.length * 3) / 4);
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return res.status(413).json({
        success: false,
        error: `La imagen es demasiado grande (${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB). El límite es 8 MB.`,
      });
    }

    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'El archivo enviado no es una imagen válida.',
      });
    }

    // Sanitise targetLanguage
    const safeTargetLanguage =
      String(targetLanguage)
        .slice(0, 60)
        .replace(/[^\p{L}\p{N}\s\-]/gu, '')
        .trim() || 'Español';

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'FotoTraductor/1.0',
        },
      },
    });

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

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

    const config = {
      systemInstruction:
        'Eres un motor de traducción visual ultrarrápido y preciso. Detectas idiomas automáticamente y devuelves traducciones limpias y útiles en formato JSON.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasText: {
            type: Type.BOOLEAN,
            description:
              'Verdadero si hay texto legible en la imagen, falso si no hay texto.',
          },
          detectedLanguage: {
            type: Type.STRING,
            description:
              'Nombre del idioma detectado en español (ej. Inglés, Francés, Alemán, Japonés, Italiano, Ruso, etc.).',
          },
          detectedLanguageCode: {
            type: Type.STRING,
            description:
              'Código ISO de 2 letras del idioma detectado (ej. en, fr, de, ja, es).',
          },
          originalText: {
            type: Type.STRING,
            description:
              'Transcripción completa del texto original encontrado en la foto.',
          },
          translatedText: {
            type: Type.STRING,
            description:
              'Traducción completa, fluida y natural al idioma destino.',
          },
          targetLanguage: {
            type: Type.STRING,
            description: 'Idioma de destino solicitado (ej. Español).',
          },
          confidence: {
            type: Type.STRING,
            description:
              'Nivel de confianza de la detección: alta, media, o baja.',
          },
          summary: {
            type: Type.STRING,
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
    };

    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-flash',
      'gemini-flash-latest',
    ];
    let lastError: any = null;
    let responseText: string | undefined;

    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await ai.models.generateContent({
            model,
            contents: {
              parts: [imagePart, { text: promptText }],
            },
            config,
          });
          responseText = result.text;
          if (responseText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(
            `Model ${model} attempt ${attempt + 1} failed:`,
            err?.message || err
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 800 * (attempt + 1))
          );
        }
      }
      if (responseText) break;
    }

    if (!responseText) {
      if (lastError && String(lastError).includes('503')) {
        throw new Error(
          'Los servidores de Google AI tienen alta demanda en este momento. Por favor, pulsa en Reintentar en unos segundos.'
        );
      }
      const msg = String(lastError?.message || lastError || '');
      if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
        throw new Error(
          'La clave de API de Gemini no es válida. Revisa tu clave en Ajustes.'
        );
      }
      throw new Error('No se pudo obtener una respuesta del modelo. Inténtalo de nuevo.');
    }

    const parsedData = JSON.parse(responseText);
    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error en /api/translate-photo:', error);
    const message = error?.message || 'Error desconocido al procesar la imagen';
    return res.status(500).json({
      success: false,
      error: `No se pudo traducir la foto: ${message}`,
    });
  }
});

// Configure Vite middleware in development or serve static in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FotoTraductor server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
