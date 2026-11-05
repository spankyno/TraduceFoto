import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev server strictly requires port 3000
const PORT = 3000;

// Increase payload limit for base64 camera images
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Translation API endpoint
app.post('/api/translate-photo', async (req, res) => {
  try {
    const { image, targetLanguage = 'Español' } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'No se ha proporcionado ninguna imagen para procesar.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error:
          'La clave de API de Gemini no está configurada en las variables de entorno del servidor. Por favor, asegúrate de configurar GEMINI_API_KEY en los secretos.',
      });
    }

    // Clean base64 data and extract mimeType
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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
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
3. Traduce fielmente y de manera natural todo el texto extraído al idioma objetivo: "${targetLanguage}".
   - Si el texto original ya está en el idioma objetivo ("${targetLanguage}"), indícalo claramente y mantén la transcripción original limpia.
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
            description: 'Verdadero si hay texto legible en la imagen, falso si no hay texto.',
          },
          detectedLanguage: {
            type: Type.STRING,
            description:
              'Nombre del idioma detectado en español (ej. Inglés, Francés, Alemán, Japonés, Italiano, Ruso, etc.).',
          },
          detectedLanguageCode: {
            type: Type.STRING,
            description: 'Código ISO de 2 letras del idioma detectado (ej. en, fr, de, ja, es).',
          },
          originalText: {
            type: Type.STRING,
            description: 'Transcripción completa del texto original encontrado en la foto.',
          },
          translatedText: {
            type: Type.STRING,
            description: 'Traducción completa, fluida y natural al idioma destino.',
          },
          targetLanguage: {
            type: Type.STRING,
            description: 'Idioma de destino solicitado (ej. Español).',
          },
          confidence: {
            type: Type.STRING,
            description: 'Nivel de confianza de la detección: alta, media, o baja.',
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

    // Candidate models as per Gemini API guidelines: gemini-3.8-flash, gemini-flash-latest, and gemini-3.1-flash-lite
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];
    let lastError: any = null;
    let responseText: string | undefined;

    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: {
              parts: [imagePart, { text: promptText }],
            },
            config,
          });
          responseText = res.text;
          if (responseText) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} attempt ${attempt + 1} failed:`, err?.message || err);
          // Wait briefly before retrying if 503 or transient error
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
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
      throw lastError || new Error('La respuesta del modelo de IA estuvo vacía.');
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
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
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
