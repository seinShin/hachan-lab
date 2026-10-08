// Vercel 서버리스 함수: POST /api/feed  { cat, worry }
import { taste } from './_taste.js';
import { allow, clientIp } from './_limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ error: 'bad json' }); }
  }

  if (!(await allow(clientIp(req.headers), process.env))) return res.status(429).json({ limited: true });
  res.status(200).json(await taste(body, process.env));
}
