const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { parse } = require('node:url');
const next = require('next');

const startedAt = Date.now();

// Safe production default: only run in dev mode when NODE_ENV is explicitly "development".
// Prevents accidental dev-mode boot on Cloud Run / npm start when NODE_ENV is unset.
const dev = process.env.NODE_ENV === 'development';
if (!dev && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10) || 3000;

if (!dev) {
  const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID');
  if (!fs.existsSync(buildIdPath)) {
    console.error('[startup] Missing .next/BUILD_ID. Run `npm run build` before starting in production mode.');
    process.exit(1);
  }
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url || '/', true);

        // Ultra-fast zero-overhead Cloud Run / container liveness probe
        if (parsedUrl.pathname === '/healthz') {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(
            JSON.stringify({
              ok: true,
              status: 'healthy',
              uptimeSec: Math.round(process.uptime()),
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error handling request:', req.url, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
        } else {
          res.end();
        }
      }
    });

    // Align timeouts above GCP / Cloud Run 60s load balancer idle keep-alive timeout
    // to prevent intermittent 502 / ECONNRESET / refused-to-connect responses.
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    server.requestTimeout = 120_000;

    server.on('error', (err) => {
      console.error('HTTP server error:', err);
      process.exit(1);
    });

    server.listen(port, hostname, () => {
      const bootMs = Date.now() - startedAt;
      console.log(
        `> Server ready on http://${hostname}:${port} (${dev ? 'dev' : 'production'}) in ${bootMs}ms`
      );
    });

    const shutdown = (signal) => {
      console.log(`> Received ${signal}, shutting down gracefully...`);
      server.close((closeErr) => {
        if (closeErr) {
          console.error('Error during server shutdown:', closeErr);
          process.exit(1);
        }
        process.exit(0);
      });
      // Force exit if connections hang beyond Cloud Run shutdown grace period
      setTimeout(() => process.exit(0), 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Failed to prepare Next.js server:', err);
    process.exit(1);
  });
