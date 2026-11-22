const DEFAULT_SUPABASE_URL = 'https://ezyqmcrmekiqbkztbcvn.supabase.co';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const supabaseUrl = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
  const secretKey =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    'sb_publishable_2gBXhIVPOusesttjO77pzA_lJFMGMLu';

  const subPath = url.pathname.replace(/^\/supabase-admin/, '') || '/';
  const targetUrl = `${supabaseUrl}${subPath}${url.search}`;

  const forwardHeaders = new Headers();
  forwardHeaders.set('apikey', secretKey);
  forwardHeaders.set('Authorization', `Bearer ${secretKey}`);

  const allowedIncoming = ['content-type', 'prefer', 'x-upsert', 'cache-control', 'accept'];
  for (const h of allowedIncoming) {
    const val = request.headers.get(h);
    if (val) forwardHeaders.set(h, val);
  }

  const method = request.method || 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const bodyBuffer = hasBody ? await request.arrayBuffer() : undefined;
    const response = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body: hasBody && bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
    });

    const respHeaders = new Headers(response.headers);
    respHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err?.message || 'Cloudflare Pages admin proxy error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

