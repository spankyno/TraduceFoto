import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { translate, parseModels, MAX_BODY_BYTES } from './shared/translate-core';
import { MemoryRateLimiter, sha256Hex } from './shared/rate-limit';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.disable('x-powered-by');

// Mismo límite que producción (base64 de 8 MB + margen)
app.use(express.json({ limit: MAX_BODY_BYTES }));

// Limitadores en memoria (solo desarrollo local)
const ipLimiter = new MemoryRateLimiter(60_000, 12);
const keyLimiter = new MemoryRateLimiter(60_000, 20);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'local-dev',
    requiresClientApiKey: true,
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/translate-photo', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    // No se confía en x-forwarded-for: es falsificable por el cliente.
    const clientIp = req.socket.remoteAddress || 'unknown';
    if (!ipLimiter.check(`ip:${clientIp}`)) {
      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes desde tu IP. Espera un minuto e inténtalo de nuevo.',
      });
    }

    const header = req.headers['x-gemini-api-key'];
    const apiKey = typeof header === 'string' ? header.trim() : '';
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        requiresApiKey: true,
        error:
          'No se ha configurado ninguna clave de API. Por favor, pulsa en Ajustes (icono ⚙️) e introduce tu GEMINI API KEY.',
      });
    }

    if (!keyLimiter.check(`key:${await sha256Hex(apiKey)}`)) {
      return res.status(429).json({
        success: false,
        error: 'Has alcanzado el límite de solicitudes para esta clave de API. Espera un minuto.',
      });
    }

    const result = await translate({
      apiKey,
      body: req.body,
      models: parseModels(process.env.GEMINI_MODELS),
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error en /api/translate-photo:', error instanceof Error ? error.name : error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al procesar la traducción. Inténtalo de nuevo.',
    });
  }
});

// Errores del parser JSON (p. ej. cuerpo demasiado grande) -> respuesta JSON limpia
app.use(
  (err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        error: 'La solicitud es demasiado grande. El límite de imagen es 8 MB.',
      });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ success: false, error: 'JSON no válido.' });
    }
    return next(err);
  }
);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FotoTraductor server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
