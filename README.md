# FotoTraductor – Cámara y Traducción

**URL de producción:** [https://traducefoto.pages.dev/](https://traducefoto.pages.dev/)

Aplicación web progresiva (PWA) que permite **capturar o subir una foto**, detectar el texto automáticamente mediante OCR y **traducirlo al idioma elegido** con detección automática del idioma de origen. Impulsada por la API de Google Gemini.

---

## Características principales

- 📷 **Captura con la cámara** del dispositivo (frontal / trasera + linterna)
- 🖼️ **Subida de fotos** desde la galería
- 🔍 **OCR + detección automática de idioma**
- 🌍 **Traducción multiidioma** (el usuario elige el idioma de destino)
- 📱 **PWA instalable** (funciona como app nativa en móvil y escritorio)
- 🔒 **Privacidad**: cada usuario aporta su propia Gemini API Key (no se usa clave del servidor)
- ⚡ Rápida, ligera y optimizada para móvil
- 🌙 Interfaz oscura moderna

---

## Autor y enlaces

| Recurso | URL |
|---------|-----|
| **Aplicación** | [https://traducefoto.pages.dev/](https://traducefoto.pages.dev/) |
| **Autor** | Aitor Sánchez Gutiérrez |
| **Blog personal** | [https://aitorsanchez.pages.dev](https://aitorsanchez.pages.dev) |
| **Aitor Hub** | [https://aitorhub.vercel.app](https://aitorhub.vercel.app) |
| **Contacto** | [https://aitorsanchez.pages.dev/contacto](https://aitorsanchez.pages.dev/contacto) |

---

## Seguridad

- **No se usa ninguna API key del servidor.** Cada usuario introduce su propia Gemini API Key en Ajustes (icono ⚙️). Viaja solo en la cabecera `x-gemini-api-key` (hacia el endpoint) y `x-goog-api-key` (hacia Google); **nunca en una URL**.
- **CSP estricta** (`script-src 'self'`, `connect-src 'self'`, `object-src 'none'`…), inyectada como `<meta>` en `index.html` durante `npm run build` (ver `vite.config.ts`). Ningún script de terceros ni inline puede ejecutarse en el origen de la app, donde vive la API key (`localStorage`).
- **Analítica aislada:** el tracker de Aitor Hub se carga en `public/analytics-frame.html`, dentro de un `<iframe sandbox="allow-scripts">` **sin** `allow-same-origin`. Corre en un origen opaco y no puede leer `localStorage` ni el DOM de la app. Tiene su propia CSP, limitada al host del tracker.
- **Cabeceras de seguridad** (`public/_headers`): `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (cámara solo para la propia app), HSTS y caché. Las respuestas de `/api` fijan sus propias cabeceras en la función (`_headers` no se aplica a Functions).
- **Validación de entrada** (`shared/translate-core.ts`): `Content-Type` JSON, `Content-Length` comprobado antes de leer el cuerpo (413), lista blanca de formatos (JPEG, PNG, WebP, HEIC/HEIF), comprobación de *magic bytes*, base64 válido y límite de **8 MB** decodificados. Texto: máx. 20.000 caracteres.
- **Rate limiting:** por IP (`cf-connecting-ip`) y por clave (identificada por su hash SHA-256, nunca en claro). Ver "Rate limiting real" más abajo.
- CORS restringido al dominio de producción y a localhost. Sanitización de `targetLanguage` y instrucción anti prompt-injection en los prompts.
- Errores de la API clasificados: con clave inválida (400/401/403) se corta de inmediato; 404 (modelo retirado) y 429 saltan al siguiente modelo; 5xx reintenta una vez.

### Rate limiting real (recomendado)

El limitador en memoria solo ve su propio *isolate*; en Cloudflare es una red de seguridad, no un límite fiable. Para un límite real:

1. **Regla WAF** (Security → WAF → Rate limiting rules) sobre `/api/translate-photo`: método POST, p. ej. 12 peticiones / 1 minuto por IP. Es la opción que funciona seguro con Pages.
2. **Binding de Rate Limiting de Workers** (opcional): la función usa `env.RL_IP` y `env.RL_KEY` si existen (`{ limit({ key }) → { success } }`) y, si no, cae al limitador en memoria. Comprueba que tu despliegue de Pages permite este tipo de binding antes de depender de él.

### Modelos de Gemini

La lista por defecto está en `shared/translate-core.ts` (`DEFAULT_MODELS`) y se puede sobrescribir con la variable `GEMINI_MODELS` (lista separada por comas, en orden de preferencia). Los modelos retirados devuelven 404 y se saltan solos, pero revisa de vez en cuando https://ai.google.dev/gemini-api/docs/deprecations.

---

## Rendimiento: preprocesado de imagen en el cliente

Antes de enviar nada, `src/utils/imageProcessing.ts` redimensiona la foto a **1280 px** (lado largo) y la comprime a **WebP** (JPEG si el navegador no codifica WebP). Respeta la orientación EXIF, aplana transparencias sobre blanco y rasteriza SVG. Una foto de 8 MB / 4032×3024 pasa a ~270 KB. Las fotos de la cámara se dibujan ya a tamaño final.

Si necesitas leer texto muy pequeño, sube `MAX_IMAGE_DIMENSION` en ese fichero (a costa de más peso).

Al cambiar el idioma con un resultado abierto, solo se reenvía el **texto ya extraído** (no la foto). La cámara se apaga mientras se ve el resultado.

---

## SEO y analítica

- Meta tags Open Graph y Twitter Card completos
- Datos estructurados JSON-LD (`WebApplication`, `Person`, `WebSite`, `BreadcrumbList`)
- Verificación de Google Search Console
- Seguimiento de Aitor Hub Dashboard (aislado en un iframe sandbox, ver Seguridad)
- Canonical URL y `robots` optimizados
- Idioma principal: español (`lang="es"`)

---

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

---

## Despliegue en Cloudflare Pages

1. Conecta el repositorio a Cloudflare Pages.
2. Build command: `npm run build`
3. Output directory: `dist`
4. (Opcional) Variable `GEMINI_MODELS` para fijar los modelos a usar.
5. **No configures** la variable de entorno `GEMINI_API_KEY` (o déjala vacía). La aplicación está diseñada para que cada usuario aporte su propia clave.

---

## Estructura del proyecto

```
├── shared/
│   ├── translate-core.ts    # Validación, prompts y llamada a Gemini (compartido prod/dev)
│   └── rate-limit.ts        # Limitador en memoria + hash SHA-256
├── functions/api/
│   ├── translate-photo.ts   # Endpoint (Cloudflare Pages Functions): capa fina sobre shared/
│   └── health.ts            # Health check
├── src/
│   ├── App.tsx              # Componente principal
│   ├── components/          # UI (cámara, resultados, ajustes, etc.)
│   ├── hooks/               # useCamera, useAppSettings, usePWAInstall
│   └── utils/imageProcessing.ts  # Redimensionado/compresión con Canvas
├── public/                  # Iconos, OG image, favicon, _headers, analytics-frame.html
├── server.ts                # Servidor de desarrollo local (usa shared/)
├── index.html               # HTML con SEO + JSON-LD
└── vite.config.ts           # Vite + PWA + inyección de la CSP en el build
```

---

## Licencia y créditos

Desarrollado por **Aitor Sánchez Gutiérrez**.  
Proyecto personal dentro del ecosistema [Aitor Hub](https://aitorhub.vercel.app).
