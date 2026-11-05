# FotoTraductor – Cámara y Traducción

Aplicación web / PWA que permite capturar o subir una foto, detectar el texto automáticamente y traducirlo al idioma elegido usando la API de Google Gemini.

**URL de producción:** https://traducefoto.pages.dev/

## Seguridad (importante)

- **No se usa ninguna API key del servidor.** Cada usuario debe introducir su propia Gemini API Key en Ajustes (icono ⚙️).
- Rate limiting por IP (12 req/min) y por clave de API (20 req/min).
- Límite estricto de tamaño de imagen: **8 MB** (decodificados).
- CORS restringido al dominio de producción y a localhost.
- Sanitización básica del parámetro `targetLanguage` para mitigar prompt injection.

Para límites más estrictos en producción se recomienda activar además las **Rate Limiting Rules** de Cloudflare (Security → WAF).

## Desarrollo local

**Prerrequisitos:** Node.js 20+

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. (Opcional) Crear `.env.local` si quieres pruebas con una clave, aunque el endpoint **exige** que la clave se envíe desde el cliente.
3. Arrancar:
   ```bash
   npm run dev
   ```
   La aplicación estará en http://localhost:3000

## Despliegue en Cloudflare Pages

1. Conecta el repositorio a Cloudflare Pages.
2. Build command: `npm run build`
3. Output directory: `dist`
4. **No configures** la variable de entorno `GEMINI_API_KEY` (o déjala vacía). La aplicación está diseñada para que cada usuario aporte su propia clave.

## Estructura relevante

- `functions/api/translate-photo.ts` – Endpoint de traducción (Cloudflare Pages Functions)
- `functions/api/health.ts` – Health check
- `server.ts` – Servidor de desarrollo local (misma lógica de seguridad)
- `src/` – Frontend React + PWA
