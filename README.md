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

- **No se usa ninguna API key del servidor.** Cada usuario debe introducir su propia Gemini API Key en Ajustes (icono ⚙️).
- Rate limiting por IP (12 req/min) y por clave de API (20 req/min).
- Límite estricto de tamaño de imagen: **8 MB** (decodificados).
- CORS restringido al dominio de producción y a localhost.
- Sanitización básica del parámetro `targetLanguage` para mitigar prompt injection.

Para límites más estrictos en producción se recomienda activar además las **Rate Limiting Rules** de Cloudflare (Security → WAF).

---

## SEO y analítica

- Meta tags Open Graph y Twitter Card completos
- Datos estructurados JSON-LD (`WebApplication`, `Person`, `WebSite`, `BreadcrumbList`)
- Verificación de Google Search Console
- Script de seguimiento de Aitor Hub Dashboard
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
4. **No configures** la variable de entorno `GEMINI_API_KEY` (o déjala vacía). La aplicación está diseñada para que cada usuario aporte su propia clave.

---

## Estructura del proyecto

```
├── functions/api/
│   ├── translate-photo.ts   # Endpoint de traducción (Cloudflare Pages Functions)
│   └── health.ts            # Health check
├── src/
│   ├── App.tsx              # Componente principal
│   ├── components/          # UI (cámara, resultados, ajustes, etc.)
│   └── hooks/               # useCamera, useAppSettings, usePWAInstall
├── public/                  # Iconos, OG image, favicon
├── server.ts                # Servidor de desarrollo local
├── index.html               # HTML con SEO + JSON-LD + tracker
└── vite.config.ts           # Vite + PWA plugin
```

---

## Licencia y créditos

Desarrollado por **Aitor Sánchez Gutiérrez**.  
Proyecto personal dentro del ecosistema [Aitor Hub](https://aitorhub.vercel.app).
