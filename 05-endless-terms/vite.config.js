import { defineConfig, loadEnv } from 'vite';
import { board, submit } from './api/_rank.js';
import { allow, clientIp } from './api/_limit.js';

// 개발 서버에서 /api/rank 를 배포용 함수(api/rank.js)와 같은 로직으로 처리
function devApi(env) {
  return {
    name: 'terms-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/rank', (req, res) => {
        const send = (status, out) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(out));
        };
        if (req.method === 'GET') {
          const kind = new URL(req.url, 'http://x').searchParams.get('board');
          return board(kind, env).then(out => send(200, out), () => send(503, { error: 'store' }));
        }
        if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', async () => {
          let body;
          try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'bad json' }); }
          if (!(await allow(clientIp(req.headers), env))) return send(429, { limited: true });
          try {
            const { status, out } = await submit(body, env);
            send(status, out);
          } catch {
            send(503, { error: 'store' });
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [devApi(env)] };
});
