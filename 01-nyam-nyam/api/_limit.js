// 호출 횟수 제한: IP당 1분에 N번 (고정 창)
// UPSTASH_REDIS_REST_URL / TOKEN 이 있으면 Upstash Redis로 세고, 없으면 메모리로 센다.
// 메모리 방식은 서버리스 인스턴스마다 따로 세므로 공개 배포에선 Upstash를 연결할 것.

const mem = new Map();

export function clientIp(headers = {}) {
  const fwd = headers['x-forwarded-for'];
  return String((Array.isArray(fwd) ? fwd[0] : fwd) || headers['x-real-ip'] || 'local').split(',')[0].trim();
}

export async function allow(ip, env = {}) {
  const max = Number(env.NYAM_RATE_PER_MIN) || 10;
  const key = `nyam:${ip}:${Math.floor(Date.now() / 60000)}`;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const r = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}` },
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
