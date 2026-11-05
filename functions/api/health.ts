interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestGet = async (context: {
  env: Env;
}): Promise<Response> => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      platform: 'cloudflare-pages',
      hasApiKey: !!context.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
