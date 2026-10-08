// 고양이 세 마리 설정. 성격 프롬프트는 api/_taste.js 의 PERSONA 와 짝을 맞출 것.
// chew: 다 삼킨 뒤 씹는 최소 시간(ms). 까망은 한입에, 치즈는 우물우물, 백설은 천천히 음미.
// 색: fur 털, line 테두리(털보다 한 톤 진하게), inner 귀 안쪽, chest 가슴·주둥이, whisker 수염
export const CATS = {
  kkamang: {
    name: '까망', tag: '츤데레', max: 3, chew: 500, eye: 'sleepy',
    fur: '#2d2c33', line: '#17161b', inner: '#5a4650', chest: null, whisker: '#9a98a3', iris: '#d8cc55',
    hello: '...뭐. 줄 거면 빨리 줘.',
    empty: '빈 그릇이잖아.',
    full: '됐어. 가.',
    chewing: '꿀꺽.',
    slow: '천천히 줘. 체하겠어.',
  },
  cheese: {
    name: '치즈', tag: '먹보', max: 7, chew: 1400, eye: 'round',
    fur: '#f0b257', line: '#a8661f', inner: '#f6c9a6', chest: '#fff2dc', whisker: '#b98a55', iris: '#c9862b',
    stripe: '#d98a32',
    hello: '밥이다! 밥이지? 그치?',
    empty: '어? 아무것도 없는데?',
    full: '배불러... 쿨쿨...',
    chewing: '우물우물 냠냠...',
    slow: '잠깐! 아직 씹고 있어! 조금만 있다 줘!',
  },
  baekseol: {
    name: '백설', tag: '미식가', max: 5, chew: 1800, eye: 'closed',
    fur: '#fbf8f3', line: '#b9ab9b', inner: '#f3c4c4', chest: null, whisker: '#c9bcad', iris: '#7fa7c9',
    hello: '오늘의 재료를 보여주시지요.',
    empty: '빈 접시는 평가할 수 없습니다.',
    full: '오늘 코스는 여기까지입니다.',
    chewing: '음... 음미하는 중입니다.',
    slow: '코스 요리는 서두르지 않는 법입니다. 잠시 후에 주시지요.',
  },
};

// 눈: 왼쪽 (64,62), 오른쪽 (96,62) 기준
function eyes(c) {
  const one = (x) => {
    if (c.eye === 'closed') {
      // 지그시 감은 눈 + 속눈썹
      return `<path d="M${x - 8} 62q8 6 16 0" stroke="${c.line}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M${x - 8} 62l-3 2M${x + 8} 62l3 2" stroke="${c.line}" stroke-width="1.5" stroke-linecap="round"/>`;
    }
    const eye = `<ellipse cx="${x}" cy="62" rx="8" ry="${c.eye === 'round' ? 9 : 7.5}" fill="${c.iris}" stroke="${c.line}" stroke-width="1.5"/>
      <ellipse cx="${x}" cy="62.5" rx="${c.eye === 'round' ? 4.5 : 2}" ry="${c.eye === 'round' ? 7 : 6}" fill="#1b1410"/>
      <circle cx="${x - 2.5}" cy="58.5" r="2" fill="#fff"/>`;
    if (c.eye === 'sleepy') {
      // 반쯤 덮은 윗눈꺼풀: 시큰둥한 표정
      return `${eye}<path d="M${x - 10} 62q10 -5 20 0V51H${x - 10}z" fill="${c.fur}"/>
        <path d="M${x - 9} 61.5q9 -4 18 0" stroke="${c.line}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
    return eye;
  };
  return `<g class="eyes">${one(64)}${one(96)}</g>`;
}

function stripes(c) {
  if (!c.stripe) return { head: '', body: '' };
  const s = `stroke="${c.stripe}" stroke-width="3.5" stroke-linecap="round" fill="none"`;
  return {
    head: `<path d="M80 33v10M71 35l2 8M89 35l-2 8" ${s}/>`,
    body: `<path d="M45 112q8 3 13 -2M44 126q9 3 14 -2M115 112q-8 3 -13 -2M116 126q-9 3 -14 -2" ${s}/>`,
  };
}

// fat: 0~1, 먹을수록 몸이 옆으로 통통해짐
// 입(.mouth)은 평소엔 닫혀 있고(ω 모양 선만 보임), 먹을 때 CSS로 벌어진다
// 볼(.cheeks), 혀(.tongue)는 먹는 동작·맛 반응에서만 드러난다
export function catSvg(id, fat = 0) {
  const c = CATS[id];
  const st = stripes(c);
  const sx = 1 + fat * 0.3;
  const blinkDelay = { kkamang: 1.3, cheese: 0.4, baekseol: 2.6 }[id];
  const napkin = id === 'baekseol'
    ? `<path d="M66 98h28l-13 18q-1 2 -2 0z" fill="#d95a5a" stroke="#b44545" stroke-width="1.2" stroke-linejoin="round"/>
       <path d="M73 98l7 10 7 -10" stroke="#f3dada" stroke-width="1" fill="none"/>` : '';
  const muzzle = c.chest
    ? `<ellipse cx="73" cy="83" rx="9" ry="7" fill="${c.chest}"/><ellipse cx="87" cy="83" rx="9" ry="7" fill="${c.chest}"/>` : '';
  const chest = c.chest ? `<ellipse cx="80" cy="128" rx="18" ry="27" fill="${c.chest}"/>` : '';
  const ln = `stroke="${c.line}" stroke-width="1.6" stroke-linejoin="round"`;

  return `<svg viewBox="0 0 160 180" class="cat" role="img" aria-label="${c.name}">
    <ellipse cx="80" cy="171" rx="48" ry="6" fill="#3a2a1a" opacity="0.1"/>
    <g class="tail">
      <path d="M108 160C142 164 150 132 137 110" stroke="${c.line}" stroke-width="15" stroke-linecap="round" fill="none"/>
      <path d="M108 160C142 164 150 132 137 110" stroke="${c.fur}" stroke-width="12" stroke-linecap="round" fill="none"/>
      ${c.stripe ? `<path d="M140 140l8 3M143 124l8 -1" stroke="${c.stripe}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
    </g>
    <g class="breathe">
      <g transform="translate(80 168) scale(${sx} 1) translate(-80 -168)">
        <path d="M80 80C56 80 44 102 42 127C40 152 52 168 80 168S120 152 118 127C116 102 104 80 80 80Z" fill="${c.fur}" ${ln}/>
        ${chest}${st.body}
      </g>
      <g class="paws">
        <ellipse cx="66" cy="165" rx="11" ry="7" fill="${c.fur}" ${ln}/>
        <ellipse cx="94" cy="165" rx="11" ry="7" fill="${c.fur}" ${ln}/>
        <path d="M63 163v4M69 163v4M91 163v4M97 163v4" stroke="${c.line}" stroke-width="1" stroke-linecap="round" opacity="0.6"/>
      </g>
      <g class="head">
        <path class="ear-out" d="M47 52L43 17Q44 12 49 14L73 34Z" fill="${c.fur}" ${ln}/>
        <path class="ear-out" d="M113 52L117 17Q116 12 111 14L87 34Z" fill="${c.fur}" ${ln}/>
        <path d="M51 43L49 23L66 35Z" fill="${c.inner}"/>
        <path d="M109 43L111 23L94 35Z" fill="${c.inner}"/>
        <path d="M40 66C38 44 56 30 80 30S122 44 120 66C126 72 123 82 115 84C107 96 95 101 80 101S53 96 45 84C37 82 34 72 40 66Z" fill="${c.fur}" ${ln}/>
        ${st.head}
        <g class="cheeks">
          <ellipse cx="56" cy="84" rx="13" ry="10" fill="${c.fur}" ${ln}/>
          <ellipse cx="104" cy="84" rx="13" ry="10" fill="${c.fur}" ${ln}/>
        </g>
        <ellipse cx="54" cy="76" rx="7" ry="4" fill="#f29a9a" opacity="0.3"/>
        <ellipse cx="106" cy="76" rx="7" ry="4" fill="#f29a9a" opacity="0.3"/>
        ${muzzle}
        <g style="--blink-delay:${blinkDelay}s">${eyes(c)}</g>
        <g stroke="${c.whisker}" stroke-width="1" stroke-linecap="round">
          <path d="M66 82L38 78M66 85L38 88M94 82L122 78M94 85L122 88"/>
        </g>
        <path class="tongue" d="M75 88Q80 99 85 88Z" fill="#e8737f"/>
        <ellipse class="mouth" cx="80" cy="88" rx="7" ry="6" fill="#6e2a35"/>
        <path d="M76 76Q80 74 84 76Q82 80 80 81Q78 80 76 76Z" fill="#e58a8f"/>
        <path class="lips" d="M80 81v3M80 84Q76 88 72 85M80 84Q84 88 88 85" stroke="${c.line}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        ${napkin}
      </g>
    </g>
  </svg>`;
}
