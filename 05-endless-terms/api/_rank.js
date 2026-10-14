// 랭킹 저장·조회 로직 (개발 서버와 배포 함수가 함께 씀)
// 기록 하나 = Redis 정렬 집합(sorted set)의 원소 하나. 점수(score)는 걸린 시간(ms).
//  - 빠른 순: 점수 낮은 순 (ZRANGE)
//  - 해탈 순: 점수 높은 순 (ZREVRANGE) — 오래 걸린 사람일수록 위
// Upstash 접속 정보(_upstash.js)가 있으면 Upstash Redis에, 없으면 메모리에 저장한다.
// 메모리 방식은 서버를 끄면 사라지고 서버리스 인스턴스마다 따로라서, 공개 배포에선 Upstash를 연결할 것.
import { randomUUID } from 'node:crypto';
import { upstash } from './_upstash.js';

const KEY = 'terms:runs';
const MIN_MS = 25_000;        // 이보다 빠르면 조작으로 보고 거절 (정상 플레이는 최소 40초쯤 걸림)
const MAX_MS = 60 * 60_000;   // 1시간 넘게 걸린 기록은 받지 않음
const NAME_MAX = 12;
const TOP = 10;

const mem = [];  // { member, score } — 항상 빠른 순으로 정렬해 둠

const useRedis = env => Boolean(upstash(env));

async function redis(cmds, env) {
  const { url, token } = upstash(env);
  const r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(cmds),
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).map(x => {
    if (x.error) throw new Error(x.error);
    return x.result;
  });
}

// 원소(member)는 JSON 문자열: { id, name, escapes }. id가 있어서 같은 이름·같은 기록도 따로 저장됨
function entry(member, score) {
  const { id, name, escapes } = JSON.parse(member);
  return { id, name, escapes, ms: Number(score) };
}

// 이름: 제어문자·꺾쇠 제거, 공백 정리, 12글자까지 (이모지도 한 글자로 셈)
export function cleanName(v) {
  const s = String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, NAME_MAX).join('') || '익명의 회원';
}

export async function board(kind, env = {}) {
  const zen = kind === 'zen';
  if (useRedis(env)) {
    const [flat, total] = await redis([[zen ? 'ZREVRANGE' : 'ZRANGE', KEY, 0, TOP - 1, 'WITHSCORES'], ['ZCARD', KEY]], env);
    const top = [];
    for (let i = 0; i < flat.length; i += 2) top.push(entry(flat[i], flat[i + 1]));  // [원소, 점수, 원소, 점수…]
    return { top, total };
  }
  const list = zen ? [...mem].reverse() : mem;
  return { top: list.slice(0, TOP).map(e => entry(e.member, e.score)), total: mem.length };
}

export async function submit(body = {}, env = {}) {
  const ms = Math.round(Number(body.ms));
  const escapes = Math.round(Number(body.escapes));
  if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) return { status: 400, out: { error: 'time' } };
  if (!Number.isFinite(escapes) || escapes < 0 || escapes > 500) return { status: 400, out: { error: 'escapes' } };

  const id = randomUUID();
  const member = JSON.stringify({ id, name: cleanName(body.name), escapes });

  if (useRedis(env)) {
    const [, fast, zen, total] = await redis([
      ['ZADD', KEY, ms, member], ['ZRANK', KEY, member], ['ZREVRANK', KEY, member], ['ZCARD', KEY],
    ], env);
    return { status: 200, out: { id, fast: fast + 1, zen: zen + 1, total } };
  }

  let i = mem.findIndex(e => e.score > ms);
  if (i === -1) i = mem.length;
  mem.splice(i, 0, { member, score: ms });
  return { status: 200, out: { id, fast: i + 1, zen: mem.length - i, total: mem.length } };
}
