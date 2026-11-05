interface Env {
  GEMINI_API_KEY?: string;
}

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const origin = context.request.headers.get('Origin');

  // Do NOT reveal whether a server-side key exists.
  // The application now requires every user to supply their own Gemini API key.
  return new Response(
    JSON.stringify({
      status: 'ok',
      platform: 'cloudflare-pages',
      requiresClientApiKey: true,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    }
  );
};
