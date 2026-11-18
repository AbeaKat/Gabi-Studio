const DEFAULT_SUPABASE_URL = 'https://ezyqmcrmekiqbkztbcvn.supabase.co';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/supabase-admin')) {
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
        const response = await fetch(targetUrl, {
          method,
          headers: forwardHeaders,
          body: hasBody ? request.body : undefined,
        });

        const respHeaders = new Headers(response.headers);
        return new Response(response.body, {
          status: response.status,
          headers: respHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ message: err?.message || 'Cloudflare admin proxy error' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (env.ASSETS) {
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status === 404 && !url.pathname.includes('.')) {
        return env.ASSETS.fetch(new URL('/index.html', request.url));
      }
      return assetRes;
    }

    return new Response('Not Found', { status: 404 });
  },
};

