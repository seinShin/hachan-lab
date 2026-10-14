// Vercel 서버리스 함수
//  GET  /api/rank?board=fast|zen          → { top: [{ id, name, ms, escapes }], total }
//  POST /api/rank  { name, ms, escapes }  → { id, fast, zen, total }  (fast/zen = 내 순위)
import { board, submit } from './_rank.js';
import { allow, clientIp } from './_limit.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json(await board(req.query.board, process.env));
    if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST' });

    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ error: 'bad json' }); }
    }

    if (!(await allow(clientIp(req.headers), process.env))) return res.status(429).json({ limited: true });
    const { status, out } = await submit(body, process.env);
    res.status(status).json(out);
  } catch {
    res.status(503).json({ error: 'store' });
  }
}
