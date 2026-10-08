import { defineConfig, loadEnv } from 'vite';
import { taste } from './api/_taste.js';
import { allow, clientIp } from './api/_limit.js';

// 개발 서버에서 /api/feed 를 배포용 함수(api/feed.js)와 같은 로직으로 처리
function devApi(env) {
  return {
    name: 'nyam-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/feed', (req, res) => {
        const send = (status, out) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(out));
        };
        if (req.method !== 'POST') return send(405, { error: 'POST only' });
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', async () => {
          let body;
          try { body = JSON.parse(raw || '{}'); } catch { return send(400, { error: 'bad json' }); }
          if (!(await allow(clientIp(req.headers), env))) return send(429, { limited: true });
          send(200, await taste(body, env));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [devApi(env)] };
});
