import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function supabaseAdminBridgePlugin(supabaseUrl: string, secretKey: string): Plugin {
  const attachMiddleware = (middlewares: any) => {
    middlewares.use('/supabase-admin', async (req: any, res: any) => {
      try {
        const subPath = req.url || '/';
        const targetUrl = `${supabaseUrl.replace(/\/$/, '')}${subPath}`;

        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const bodyBuffer = Buffer.concat(chunks);

        const forwardHeaders: Record<string, string> = {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          'User-Agent': 'node',
        };

        const allowedIncoming = ['content-type', 'prefer', 'x-upsert', 'cache-control', 'accept'];
        for (const h of allowedIncoming) {
          if (req.headers[h]) {
            forwardHeaders[h] = String(req.headers[h]);
          }
        }

        const method = req.method || 'GET';
        const response = await fetch(targetUrl, {
          method,
          headers: forwardHeaders,
          body: method !== 'GET' && method !== 'HEAD' && bodyBuffer.length > 0 ? bodyBuffer : undefined,
        });

        res.statusCode = response.status;
        const respContentType = response.headers.get('content-type');
        if (respContentType) {
          res.setHeader('Content-Type', respContentType);
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

        const respArrayBuffer = await response.arrayBuffer();
        res.end(Buffer.from(respArrayBuffer));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: err?.message || 'Admin proxy error' }));
      }
    });
  };

  return {
    name: 'supabase-admin-bridge',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl =
    env.VITE_SUPABASE_URL || 'https://ezyqmcrmekiqbkztbcvn.supabase.co';
  const secretKey =
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    '';

  return {
    plugins: [react(), supabaseAdminBridgePlugin(supabaseUrl, secretKey)],
    envPrefix: ['VITE_'],
    server: {
      port: 3000,
      open: false,
    },
  };
});
