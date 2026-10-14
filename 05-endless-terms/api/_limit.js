// 호출 횟수 제한: IP당 1분에 N번 (고정 창) — 01-nyam-nyam/api/_limit.js와 같은 방식
// Upstash 접속 정보(_upstash.js)가 있으면 Upstash Redis로 세고, 없으면 메모리로 센다.
import { upstash } from './_upstash.js';

const mem = new Map();

export function clientIp(headers = {}) {
  const fwd = headers['x-forwarded-for'];
  return String((Array.isArray(fwd) ? fwd[0] : fwd) || headers['x-real-ip'] || 'local').split(',')[0].trim();
}

export async function allow(ip, env = {}) {
  const max = Number(env.TERMS_RATE_PER_MIN) || 5;
  const key = `terms:limit:${ip}:${Math.floor(Date.now() / 60000)}`;

  const db = upstash(env);
  if (db) {
    try {
      const r = await fetch(`${db.url}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${db.token}` },
        body: JSON.stringify([['INCR', key], ['EXPIRE', key, 90]]),
        signal: AbortSignal.timeout(3000),
      });
      const [incr] = await r.json();
      return incr.result <= max;
    } catch {
      // Redis가 응답하지 않아도 사이트는 돌아가게 메모리 방식으로 넘어간다
    }
  }

  if (mem.size > 5000) mem.clear();
  const n = (mem.get(key) || 0) + 1;
  mem.set(key, n);
  return n <= max;
}
