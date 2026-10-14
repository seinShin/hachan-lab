# 05 · 킹받는 약관 (endless-terms)

> hachan-lab 5일차. 약관에 동의하기만 하면 되는데, 하는 사람을 최대한 킹받게 한다.

## 실행

```powershell
cd C:\sein\hachan-lab\05-endless-terms
npm install
copy .env.example .env   # 비워두면 랭킹을 메모리에 저장 (서버 끄면 사라짐)
npm run dev              # http://localhost:5173
```

`index.html`을 그냥 더블클릭해도 게임은 되지만, 랭킹은 `npm run dev`로 띄워야 보인다.

## 구조

```
index.html        게임 전체 (화면 + 스타일 + 스크립트)
api/_rank.js      랭킹 저장·조회 로직 (Upstash Redis / 없으면 메모리)
api/_limit.js     랭킹 등록 횟수 제한 (IP당 1분에 N번)
api/_upstash.js   Upstash 접속 정보 (UPSTASH_REDIS_REST_* 또는 KV_REST_API_* 둘 다 읽음)
api/rank.js       배포용 서버리스 함수 (GET·POST /api/rank)
vite.config.js    개발 서버에서 /api/rank 를 같은 로직으로 연결
```

## 배포 (Vercel)

1. Vercel에서 이 저장소로 새 프로젝트 → **Root Directory: `05-endless-terms`**
2. Storage 탭 → Upstash for Redis 만들고 프로젝트에 연결 (환경변수 `KV_REST_API_*` 자동 입력 → 코드가 그대로 읽음)
   - 직접 넣어도 됨: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - 01-nyam-nyam과 같은 DB를 써도 됨. 키가 `terms:`로 시작해서 안 겹친다.
   - 안 넣으면 메모리에 저장돼서 랭킹이 수시로 사라진다.

## 기획

### 킹받는 장치 (순서대로)

| 단계 | 장치 | 끝나는 조건 |
|---|---|---|
| 약관 | 맨 아래 닿으면 조항 추가 ("마지막 조항" → "진짜 마지막 조항") | 2번 |
| 약관 | 너무 빨리 내리면 위로 끌어올림 | 3번 |
| 체크박스 | 커서가 다가오면 도망 | 15번 도망치면 지침 |
| 체크박스 | 체크하면 "세션 만료"로 풀림 | 1번 |
| 동의 버튼 | 화면 전체로 도망, 글자가 바뀜 | 12번 도망치면 지침 |
| 확인 창 | 예/아니오 자리 바꿈 | 3번 |
| 로딩 | 99%에서 멈춤 | 약 4초 |

원칙: 킹받게 하되, 모든 방해는 횟수가 정해져 있어서 **포기만 안 하면 반드시 깰 수 있다.**

### 랭킹 · 공유

- 결과 화면에서 이름(12자)을 입력해 랭킹에 등록. 한 판에 한 번.
- ⚡ 빠른 순 / 🧘 해탈 순(오래 걸린 순) TOP 10.
- 공유: 폰은 공유 창, PC는 클립보드 복사. 링크에 `?from=이름&t=기록` → 받은 사람 화면 위에 도전장 배너.
- 조작 방지(최소한): 25초 미만 기록 거절, 이름 정리, IP당 1분에 5번 제한. 기록은 브라우저가 보내는 값이라 완벽하진 않다.
