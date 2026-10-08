// 고양이 세 마리 설정. 성격 프롬프트는 api/_taste.js 의 PERSONA 와 짝을 맞출 것.
// chew: 다 삼킨 뒤 씹는 최소 시간(ms). 까망은 한입에, 치즈는 우물우물, 백설은 천천히 음미.
// 색: fur 털, shade 셀 그림자, shine 하이라이트, line 외곽선, face 표정 선(^^ ><, 없으면 line), inner 귀 안쪽, chest 가슴·주둥이,
//     whisker 수염, iris/irisDark 눈동자 그라데이션(위가 진하고 아래가 밝다)
export const CATS = {
  kkamang: {
    name: '까망', tag: '츤데레', max: 3, chew: 500, eye: 'sleepy',
    fur: '#2d2c33', shade: '#1d1c22', shine: '#4f5878', line: '#111015', face: '#e8e4f0', inner: '#6a4f5c', chest: null,
    whisker: '#9a98a3', iris: '#ecdf6a', irisDark: '#a8932a',
    hello: '...뭐. 줄 거면 빨리 줘.',
    empty: '빈 그릇이잖아.',
    full: '됐어. 가.',
    chewing: '꿀꺽.',
    slow: '천천히 줘. 체하겠어.',
    pet: ['...만지지 마.', '흥. ...조금만이야.', '...(골골)'],
  },
  cheese: {
    name: '치즈', tag: '먹보', max: 7, chew: 1400, eye: 'round',
    fur: '#f0b257', shade: '#d98f3c', shine: '#fad595', line: '#8f5218', inner: '#f6c3a0', chest: '#fff2dc',
    whisker: '#b98a55', iris: '#e2a54a', irisDark: '#6e3f10', stripe: '#d4832c',
    hello: '밥이다! 밥이지? 그치?',
    empty: '어? 아무것도 없는데?',
    full: '배불러... 쿨쿨...',
    chewing: '우물우물 냠냠...',
    slow: '잠깐! 아직 씹고 있어! 조금만 있다 줘!',
    pet: ['헤헤 간지러워!', '골골골골~ 더 해줘!', '쓰다듬으니까 배고파지는데?'],
  },
  baekseol: {
    name: '백설', tag: '미식가', max: 5, chew: 1800, eye: 'closed',
    fur: '#fdfbf7', shade: '#e6e0ea', shine: '#ffffff', line: '#a3907f', inner: '#f5c2c6', chest: null,
    whisker: '#c9bcad', iris: '#9cc3e4', irisDark: '#4f7fa8',
    hello: '오늘의 재료를 보여주시지요.',
    empty: '빈 접시는 평가할 수 없습니다.',
    full: '오늘 코스는 여기까지입니다.',
    chewing: '음... 음미하는 중입니다.',
    slow: '코스 요리는 서두르지 않는 법입니다. 잠시 후에 주시지요.',
    pet: ['손길이 섬세하시군요.', '...골골. 실례했습니다.', '서비스는 감사히 받겠습니다.'],
  },
};

// 같은 고양이가 화면에 여러 번 그려지므로(선택 화면 + 무대) 그라데이션·클립 id를 매번 새로 만든다
let seq = 0;

const HEAD = 'M27 76C25 47 49 28 80 28S135 47 133 76C137 84 133 95 123 99C113 111 98 115 80 115S47 111 37 99C27 95 23 84 27 76Z';
const BODY = 'M80 98C58 98 47 120 47 140C47 160 60 170 80 170S113 160 113 140C113 120 102 98 80 98Z';

// 기본 눈: 왼쪽 (60,76), 오른쪽 (100,76). 그라데이션 눈동자 + 두꺼운 윗속눈썹 + 반짝이 두 개
function eyes(c, u) {
  const one = (x) => {
    if (c.eye === 'closed') return happyEye(c, x);
    const round = c.eye === 'round';
    const rx = round ? 11 : 10;
    const ry = round ? 12 : 11;
    let s = `<ellipse cx="${x}" cy="76" rx="${rx}" ry="${ry}" fill="url(#iris-${u})"/>
      <ellipse cx="${x}" cy="77.5" rx="${round ? 7 : 4.5}" ry="${round ? 9 : 8.5}" fill="#160f0b"/>
      <ellipse cx="${x}" cy="84.5" rx="${round ? 5.5 : 4.5}" ry="2" fill="${c.iris}" opacity="0.8"/>
      <ellipse cx="${x}" cy="76" rx="${rx}" ry="${ry}" fill="none" stroke="${c.line}" stroke-width="1.6"/>
      <path d="M${x - rx - 1} ${76 - ry * 0.25}Q${x} ${76 - ry * 1.35} ${x + rx + 1} ${76 - ry * 0.25}" stroke="${c.line}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <circle cx="${x - 3.5}" cy="71" r="3.8" fill="#fff"/>
      <circle cx="${x + 4}" cy="81.5" r="1.8" fill="#fff" opacity="0.9"/>`;
    if (c.eye === 'sleepy') {
      // 살짝 처진 윗눈꺼풀: 시큰둥한 표정 (위로 휘면 화난 얼굴이 된다)
      s += `<path d="M${x - 12.5} 74q12.5 2.5 25 0V60H${x - 12.5}z" fill="${c.fur}"/>
        <path d="M${x - 11.5} 74q11.5 2.5 23 0" stroke="${c.line}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    }
    return s;
  };
  return `<g class="eyes">${one(60)}${one(100)}</g>`;
}

// 웃는 눈 (^^)
function happyEye(c, x) {
  const lash = x < 80 ? `M${x - 9} 78l-3.5 -1.5` : `M${x + 9} 78l3.5 -1.5`;
  return `<path d="M${x - 9} 78q9 -11 18 0" stroke="${c.face || c.line}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="${lash}" stroke="${c.face || c.line}" stroke-width="2.2" stroke-linecap="round"/>`;
}

// 표정 바꾸기용 눈: ^^ (기쁨), >< (찡그림). 평소엔 숨어 있다가 CSS로 바뀐다
function faceEyes(c) {
  const sq = `stroke="${c.face || c.line}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  return `<g class="eyes-happy">${happyEye(c, 60)}${happyEye(c, 100)}</g>
    <g class="eyes-squint"><path d="M53 69L66 76L53 83" ${sq}/><path d="M107 69L94 76L107 83" ${sq}/></g>`;
}

function stripes(c) {
  if (!c.stripe) return { head: '', body: '' };
  const s = `stroke="${c.stripe}" stroke-width="3.5" stroke-linecap="round" fill="none"`;
  return {
    head: `<path d="M80 33v9M71 35l2 7M89 35l-2 7" ${s}/>`,
    body: `<path d="M52 128q7 3 11 -2M51 142q8 3 12 -2M108 128q-7 3 -11 -2M109 142q-8 3 -12 -2" ${s}/>`,
  };
}

function ear(c, side) {
  const left = side === 'l';
  const outer = left ? 'M34 56C31 38 34 22 41 18C47 15 60 25 69 34Z' : 'M126 56C129 38 126 22 119 18C113 15 100 25 91 34Z';
  const inner = left ? 'M41 47C40 36 42 27 45 25C49 25 56 30 61 35Z' : 'M119 47C120 36 118 27 115 25C111 25 104 30 99 35Z';
  const tuft = left ? 'M44 40l6 -3M45 46l7 -2' : 'M116 40l-6 -3M115 46l-7 -2';
  return `<g class="ear ear-${side}">
    <path class="ear-out" d="${outer}" fill="${c.fur}" stroke="${c.line}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${inner}" fill="${c.inner}"/>
    <path d="${tuft}" stroke="${c.shine}" stroke-width="1.6" stroke-linecap="round" opacity="0.8"/>
  </g>`;
}

// fat: 0~1, 먹을수록 몸이 옆으로 통통해짐
// 입(.mouth)은 평소엔 닫혀 있고(ω 모양 선만 보임), 먹거나 말할 때 CSS로 벌어진다
// 볼(.cheeks), 혀(.tongue), 표정 눈(.eyes-happy, .eyes-squint)은 반응할 때만 드러난다
export function catSvg(id, fat = 0) {
  const c = CATS[id];
  const u = `${id}-${++seq}`;
  const st = stripes(c);
  const sx = 1 + fat * 0.3;
  const blinkDelay = { kkamang: 1.3, cheese: 0.4, baekseol: 2.6 }[id];
  const ln = `stroke="${c.line}" stroke-width="2.4" stroke-linejoin="round"`;
  const prop = {
    baekseol: `<path d="M68 111h24l-11 15q-1 2 -2 0z" fill="#e06464" stroke="#a83f3f" stroke-width="1.6" stroke-linejoin="round"/>
       <path d="M74 111l6 8 6 -8" stroke="#f6dede" stroke-width="1" fill="none"/>`,
    cheese: `<circle cx="80" cy="117" r="5.5" fill="#f6cf5a" stroke="#a87b1c" stroke-width="1.6"/>
       <path d="M80 117.5v3.5" stroke="#a87b1c" stroke-width="1.3" stroke-linecap="round"/><circle cx="78" cy="115" r="1.4" fill="#fff6d0"/>`,
  }[id] || '';
  const muzzle = c.chest
    ? `<ellipse cx="74" cy="93" rx="8" ry="6" fill="${c.chest}"/><ellipse cx="86" cy="93" rx="8" ry="6" fill="${c.chest}"/>` : '';
  const chest = c.chest
    ? `<path d="M80 122c-9 0 -15 8 -15 20c0 11 6 20 15 20s15 -9 15 -20c0 -12 -6 -20 -15 -20z" fill="${c.chest}"/>
       <path d="M71 124l3 4 3 -4 3 4 3 -4 3 4 3 -4" stroke="${c.chest}" stroke-width="3" fill="none" stroke-linejoin="round"/>` : '';

  return `<svg viewBox="0 0 160 180" class="cat" role="img" aria-label="${c.name}">
    <defs>
      <linearGradient id="iris-${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.irisDark}"/><stop offset="0.65" stop-color="${c.iris}"/>
      </linearGradient>
      <clipPath id="head-${u}"><path d="${HEAD}"/></clipPath>
      <clipPath id="body-${u}"><path d="${BODY}"/></clipPath>
    </defs>
    <ellipse cx="80" cy="172" rx="44" ry="6" fill="#3a2a1a" opacity="0.12"/>
    <g class="tail">
      <path d="M104 163C134 167 145 140 132 120" stroke="${c.line}" stroke-width="17" stroke-linecap="round" fill="none"/>
      <path d="M104 163C134 167 145 140 132 120" stroke="${c.fur}" stroke-width="12.5" stroke-linecap="round" fill="none"/>
      <path d="M108 160C130 161 139 143 133 126" stroke="${c.shade}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>
      ${c.stripe ? `<path d="M134 147l8 2M136 133l8 -1" stroke="${c.stripe}" stroke-width="3.5" stroke-linecap="round"/>` : ''}
    </g>
    <g class="breathe">
      <g transform="translate(80 168) scale(${sx} 1) translate(-80 -168)">
        <path d="${BODY}" fill="${c.fur}"/>
        <g clip-path="url(#body-${u})">
          <ellipse cx="108" cy="146" rx="18" ry="34" fill="${c.shade}"/>
          <ellipse cx="80" cy="100" rx="40" ry="11" fill="${c.shade}"/>
          ${chest}${st.body}
        </g>
        <path d="${BODY}" fill="none" ${ln}/>
      </g>
      <g class="paws">
        <ellipse cx="68" cy="167" rx="10" ry="6.5" fill="${c.fur}" ${ln}/>
        <ellipse cx="92" cy="167" rx="10" ry="6.5" fill="${c.fur}" ${ln}/>
        <path d="M65.5 165v3.5M70.5 165v3.5M89.5 165v3.5M94.5 165v3.5" stroke="${c.line}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
      </g>
      <g class="head">
        ${ear(c, 'l')}${ear(c, 'r')}
        <path d="${HEAD}" fill="${c.fur}"/>
        <g clip-path="url(#head-${u})">
          <ellipse cx="98" cy="114" rx="64" ry="20" fill="${c.shade}"/>
          <ellipse cx="54" cy="44" rx="17" ry="7" fill="${c.shine}" opacity="0.6" transform="rotate(-22 54 44)"/>
          ${st.head}
        </g>
        <path d="${HEAD}" fill="none" ${ln}/>
        <path d="M71 31Q74 21 78 29Q82 19 86 30" fill="${c.fur}" stroke="${c.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <g class="cheeks">
          <ellipse cx="42" cy="97" rx="13" ry="10" fill="${c.fur}" ${ln}/>
          <ellipse cx="118" cy="97" rx="13" ry="10" fill="${c.fur}" ${ln}/>
        </g>
        <ellipse cx="45" cy="91" rx="9" ry="5" fill="#f59a9a" opacity="0.5"/>
        <ellipse cx="115" cy="91" rx="9" ry="5" fill="#f59a9a" opacity="0.5"/>
        <path d="M40 90l3 -3M45 90l3 -3M112 90l3 -3M117 90l3 -3" stroke="#e77f7f" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
        ${muzzle}
        <g style="--blink-delay:${blinkDelay}s">${eyes(c, u)}</g>
        ${faceEyes(c)}
        <g stroke="${c.whisker}" stroke-width="1.2" stroke-linecap="round">
          <path d="M60 93L33 90M60 96L34 100M100 93L127 90M100 96L126 100"/>
        </g>
        <path class="tongue" d="M76 96Q80 105 84 96Z" fill="#e8737f" stroke="${c.line}" stroke-width="1"/>
        <ellipse class="mouth" cx="80" cy="96" rx="6.5" ry="5.5" fill="#6e2a35" stroke="${c.line}" stroke-width="1.2"/>
        <path d="M77 87Q80 85.5 83 87Q81.5 90 80 90.5Q78.5 90 77 87Z" fill="#e58a8f"/>
        <path class="lips" d="M80 90.5v2M80 92.5Q77 96 74 93.5M80 92.5Q83 96 86 93.5" stroke="${c.line}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        ${prop}
      </g>
    </g>
  </svg>`;
}
