// Upstash 접속 정보. 직접 넣으면 UPSTASH_REDIS_REST_*, Vercel Storage로 연결하면 KV_REST_API_* 이름으로 들어온다.
// 둘 중 있는 쪽을 쓴다. 둘 다 없으면 null → 메모리 방식으로 동작.
export function upstash(env = {}) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}
