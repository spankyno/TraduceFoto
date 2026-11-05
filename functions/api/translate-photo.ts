interface Env {
  GEMINI_API_KEY?: string;
}

interface RequestBody {
  image?: string;
  targetLanguage?: string;
}

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          'GEMINI_API_KEY no está configurada en las Variables de Entorno de Cloudflare Pages.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = (await request.json()) as RequestBody;
    const { image, targetLanguage = 'Español' } = body;

    if (!image) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se ha proporcionado ninguna imagen para procesar.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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
              description: 'Verdadero si hay texto legible en la imagen, falso si no hay texto.',
            },
            detectedLanguage: {
              type: 'STRING',
              description:
                'Nombre del idioma detectado en español (ej. Inglés, Francés, Alemán, Japonés, Italiano, Ruso, etc.).',
            },
            detectedLanguageCode: {
              type: 'STRING',
              description: 'Código ISO de 2 letras del idioma detectado (ej. en, fr, de, ja, es).',
            },
            originalText: {
              type: 'STRING',
              description: 'Transcripción completa del texto original encontrado en la foto.',
            },
            translatedText: {
              type: 'STRING',
              description: 'Traducción completa, fluida y natural al idioma destino.',
            },
            targetLanguage: {
              type: 'STRING',
              description: 'Idioma de destino solicitado (ej. Español).',
            },
            confidence: {
              type: 'STRING',
              description: 'Nivel de confianza de la detección: alta, media, o baja.',
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

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: string | null = null;
    let responseText: string | undefined;

    for (const model of candidateModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'aistudio-build',
            },
            body: JSON.stringify(requestPayload),
          }
        );

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text();
          lastError = `Status ${geminiRes.status}: ${errBody}`;
          continue;
        }

        const geminiJson: any = await geminiRes.json();
        const candidate = geminiJson.candidates?.[0];
        responseText = candidate?.content?.parts?.[0]?.text;

        if (responseText) {
          break;
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
      }
    }

    if (!responseText) {
      throw new Error(lastError || 'La respuesta del modelo de Gemini estuvo vacía.');
    }

    const parsedData = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Error al procesar la traducción: ${err?.message || 'Error desconocido'}`,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
