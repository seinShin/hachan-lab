import { CATS, catSvg } from './cats.js';

const $ = (s) => document.querySelector(s);
const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const calm = matchMedia('(prefers-reduced-motion: reduce)');

// 저장하는 것: 오늘 고양이별 먹은 횟수, 맛 집계. 걱정 내용은 절대 저장하지 않는다.
function load() {
  try {
    const s = JSON.parse(localStorage.getItem('nyam') || '{}');
    if (s.date === today) return s;
  } catch {}
  return { date: today, eaten: {}, menu: {} };
}
function save() {
  try { localStorage.setItem('nyam', JSON.stringify(state)); } catch {}
}

const state = load();
let cat = null;
let busy = false;

// 말풍선이 바뀔 때마다 뽁 튀어나오고, talk 이면 고양이 입이 글자 수만큼 뻐끔거린다
let talkTimer = 0;
function say(text, talk = true) {
  const b = $('#bubble');
  b.textContent = text;
  b.classList.remove('pop');
  b.getBoundingClientRect(); // 애니메이션을 처음부터 다시 틀기 위한 리플로우
  b.classList.add('pop');
  const stage = $('#stage');
  clearTimeout(talkTimer);
  stage.classList.remove('talk');
  if (talk && !calm.matches && !stage.classList.contains('asleep')) {
    stage.classList.add('talk');
    talkTimer = setTimeout(() => stage.classList.remove('talk'), Math.min(2200, 300 + text.length * 60));
  }
}
const eaten = () => state.eaten[cat] || 0;
const isFull = () => eaten() >= CATS[cat].max;

const FISH = '<svg class="fish" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 7c3-5 9-6 13-3l6-3-1.5 6L20 13l-6-3C10 13 4 12 1 7z"/></svg>';
const TASTE_COLOR = {
  짠맛: '#7cc4e8', 쓴맛: '#8db36a', 싱거움: '#cfc5b4', 눅눅함: '#a9b8c2',
  과자맛: '#f6cf5a', 매운맛: '#f2874a', 신맛: '#e8d24a',
};

// 오늘의 영수증: 걱정 내용 없이 맛과 개수만
function renderReceipt() {
  // innerHTML에 넣으므로 아는 맛 이름만 통과시킨다
  const rows = Object.entries(state.menu).filter(([k]) => k in TASTE_COLOR);
  const total = rows.reduce((n, [, v]) => n + v, 0);
  const list = rows.length
    ? rows.map(([k, v]) => `<li><i style="--dot:${TASTE_COLOR[k]}"></i>${k}<b>× ${Number(v) || 0}</b></li>`).join('')
    : '<li class="empty">아직 주문이 없어요</li>';
  $('#menu').innerHTML = `
    <h2>오늘의 영수증</h2>
    <p class="date">${today.replaceAll('-', '. ')}</p>
    <ul>${list}</ul>
    <p class="total"><span>먹은 걱정</span><span>${total}개</span></p>`;
}

function render() {
  const c = CATS[cat];
  $('#stage').innerHTML = catSvg(cat, Math.min(1, eaten() / c.max));
  $('#stage').classList.toggle('asleep', isFull());
  const fish = Array.from({ length: c.max }, (_, i) => FISH.replace('class="fish"', `class="fish${i < eaten() ? ' full' : ''}"`)).join('');
  $('#belly').innerHTML = `<span class="label">${c.name}의 배</span>${fish}`;
  $('#belly').setAttribute('aria-label', `${c.name}의 배 ${c.max}칸 중 ${eaten()}칸`);
  $('#feed-btn').disabled = isFull();
  $('#worry').disabled = isFull();
  renderReceipt();
}

function choose(id) {
  cat = id;
  $('#select').hidden = true;
  $('#feed').hidden = false;
  $('#help').hidden = true;
  render();
  // 무대에 통 떨어지며 등장
  const stage = $('#stage');
  stage.classList.add('enter');
  setTimeout(() => stage.classList.remove('enter'), 650);
  setTimeout(() => say(isFull() ? CATS[id].full : CATS[id].hello), calm.matches ? 0 : 350);
}

// ---- 효과음: 파일 없이 Web Audio로 만든다 ----
let audio = null;
let soundOn = true;
try { soundOn = localStorage.getItem('nyam-sound') !== 'off'; } catch {}

// 브라우저는 사용자 동작 안에서만 소리를 허락하므로 먹이기 버튼을 누를 때 깨워 둔다
function wakeAudio() {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {}
}

function tone(from, to, dur, vol = 0.15) {
  if (!soundOn || !audio) return;
  const t = audio.currentTime;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
const pop = (i) => tone(520 + (i % 5) * 70, 240, 0.08, 0.08); // 글자가 입에 들어갈 때 "뽁"
const gulp = () => tone(260, 90, 0.22, 0.2); // 다 삼킬 때 "꿀꺽"

function renderSound() {
  $('#sound').textContent = soundOn ? '소리 끄기' : '소리 켜기';
  $('#sound').setAttribute('aria-pressed', String(!soundOn));
}

// ---- 글자가 한 글자씩 고양이 입으로 빨려 들어가는 애니메이션 ----
function suck(text) {
  const from = $('#worry').getBoundingClientRect();
  // 선택 화면의 고양이들도 .mouth 를 갖고 있으니 무대 위 고양이로 좁혀서 찾는다
  const to = $('#stage .mouth').getBoundingClientRect();
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  const svg = $('#stage .cat');
  const chars = [...text].filter((ch) => ch.trim()).slice(0, 60);
  const cols = Math.max(1, Math.floor((from.width - 32) / 17));
  const jobs = chars.map((ch, i) => {
    const el = document.createElement('span');
    el.className = 'bite';
    el.textContent = ch;
    const x = from.left + 16 + (i % cols) * 17;
    const y = from.top + 14 + Math.floor(i / cols) * 22;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.append(el);
    const spin = calm.matches ? 0 : (i % 2 ? 1 : -1) * 200;
    const a = el.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        // 입 근처에서 살짝 휘어 들어가도록 중간 지점을 하나 둔다
        { transform: `translate(${(tx - x) * 0.6}px, ${(ty - y) * 0.75 - 24}px) scale(0.7) rotate(${spin / 2}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${tx - x}px, ${ty - y}px) scale(0.1) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: calm.matches ? 250 : 550, delay: i * (calm.matches ? 10 : 35), easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' },
    );
    return a.finished.then(() => {
      el.remove();
      pop(i);
      // 세 글자마다 고양이가 움찔 받아먹는다
      if (i % 3 === 0 && !calm.matches) {
        svg?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04, 0.97)' }, { transform: 'scale(1)' }], { duration: 140 });
      }
    });
  });
  return Promise.all(jobs);
}

// ---- 맛 반응: 맛마다 표정 한 컷 + 떠오르는 작은 그림 ----
// 이모지 대신 고양이와 같은 그림체의 SVG를 쓴다
const icon = (body) => `<svg viewBox="0 0 24 24">${body}</svg>`;
const ICON = {
  drop: icon('<path d="M12 3C9.5 7.5 6 10.5 6 15a6 6 0 0 0 12 0c0-4.5-3.5-7.5-6-12z" fill="#8ccbe9" stroke="#5aa3c8" stroke-width="1.2"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
  leaf: icon('<path d="M5 19C5 10 10.5 5 20 4.5 19.5 14 14 19 5 19z" fill="#8db36a" stroke="#6a8f4b" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 19L15 9" stroke="#6a8f4b" stroke-width="1.2" stroke-linecap="round"/>'),
  sweat: icon('<path d="M8 4C6.5 7 5 8.5 5 10.5a3 3 0 0 0 6 0C11 8.5 9.5 7 8 4zM16 11c-1.5 3-3 4.5-3 6.5a3 3 0 0 0 6 0c0-2-1.5-3.5-3-6.5z" fill="#b7c6cf" stroke="#8fa3ae" stroke-width="1.1"/>'),
  sparkle: icon('<path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2L12 21.5l-2.2-7.3L2.5 12l7.3-2.2z" fill="#f6cf5a" stroke="#d9a930" stroke-width="1" stroke-linejoin="round"/>'),
  flame: icon('<path d="M12 2.5c1 4 6 6 6 11.5a6 6 0 0 1-12 0c0-3 1.7-5 3-7 .2 2.6 1.2 3.8 2.8 4.2C10.8 8.4 11 5 12 2.5z" fill="#f2874a" stroke="#d4602a" stroke-width="1.2" stroke-linejoin="round"/><path d="M12 13.5c1.5 1.5 2.5 2.6 2.5 4a2.5 2.5 0 0 1-5 0c0-1.4 1-2.5 2.5-4z" fill="#ffd36b"/>'),
  lemon: icon('<circle cx="12" cy="12" r="8.5" fill="#f7dc5c" stroke="#d9b52c" stroke-width="1.2"/><circle cx="12" cy="12" r="6" fill="#fbeea0"/><path d="M12 6v12M6.8 9l10.4 6M6.8 15l10.4-6" stroke="#f0d34a" stroke-width="1.2"/>'),
  heart: icon('<path d="M12 20.5S4.5 16 4.5 10A4 4 0 0 1 12 7.6 4 4 0 0 1 19.5 10c0 6-7.5 10.5-7.5 10.5z" fill="#f491a5" stroke="#d6607a" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8.6" cy="9.6" r="1.4" fill="#fff" opacity="0.8"/>'),
};
// face: 맛 반응 때 바뀌는 표정 (happy ^^, squint ><)
const REACT = {
  짠맛: { cls: 'salty', fx: ICON.drop, face: 'happy' },
  쓴맛: { cls: 'bitter', fx: ICON.leaf, face: 'squint' },
  싱거움: { cls: 'bland', fx: '?' },
  눅눅함: { cls: 'soggy', fx: ICON.sweat },
  과자맛: { cls: 'snack', fx: ICON.sparkle, face: 'happy' },
  매운맛: { cls: 'spicy', fx: ICON.flame, face: 'squint' },
  신맛: { cls: 'sour', fx: ICON.lemon, face: 'squint' },
};
const MOODS = ['face-happy', 'face-squint', 'pet', ...Object.values(REACT).map((v) => `t-${v.cls}`)];
let moodTimer = 0;

// 잠깐 동안만 표정·동작 클래스를 붙였다 뗀다 (맛 반응, 쓰다듬기 공용)
function mood(classes, ms) {
  const stage = $('#stage');
  clearTimeout(moodTimer);
  stage.classList.remove(...MOODS);
  stage.classList.add(...classes);
  moodTimer = setTimeout(() => stage.classList.remove(...classes), ms);
}

// 고양이 위로 작은 그림이 몽글몽글 떠오른다
function burst(html, n = 3) {
  if (calm.matches) return;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span');
    el.className = 'fx';
    el.innerHTML = html;
    el.style.left = `${30 + i * (40 / n) + Math.random() * 10}%`;
    el.style.animationDelay = `${i * 120}ms`;
    el.addEventListener('animationend', () => el.remove());
    $('#fx').append(el);
  }
}

function react(taste) {
  const r = REACT[taste];
  if (!r) return;
  mood([`t-${r.cls}`, ...(r.face ? [`face-${r.face}`] : [])], 1800);
  burst(r.fx);
}

// ---- 쓰다듬기: 고양이를 누르면 ^^ 하고 골골 ----
const purr = () => { for (let k = 0; k < 6; k++) setTimeout(() => tone(120, 95, 0.08, 0.07), k * 85); };
function petCat() {
  if (!cat || busy) return;
  if (isFull()) return say('...쿨쿨', false);
  wakeAudio();
  mood(['pet', 'face-happy'], 1100);
  burst(ICON.heart, 4);
  purr();
  const lines = CATS[cat].pet;
  say(lines[Math.floor(Math.random() * lines.length)]);
}

async function feed(e) {
  e.preventDefault();
  if (busy || isFull()) return;
  const worry = $('#worry').value.trim();
  if (!worry) return say(CATS[cat].empty);

  const c = CATS[cat];
  const stage = $('#stage');
  wakeAudio();
  busy = true;
  $('#feed-btn').disabled = true;
  $('#worry').disabled = true;
  $('#help').hidden = true;
  $('#worry').value = ''; // 걱정은 화면에서 사라지고 다시 볼 수 없다
  say('아—', false);

  const ask = fetch('/api/feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cat, worry }),
  })
    .then((r) => (r.status === 429 ? { limited: true } : r.json()))
    .catch(() => ({ taste: '신맛', line: '...(꿀꺽)' }));

  // 1) 입을 벌리고 글자를 받아먹는다
  stage.classList.add('open');
  await wait(calm.matches ? 0 : 180);
  await suck(worry);
  stage.classList.remove('open');
  gulp();

  // 2) 고양이마다 다르게 씹는다 (AI 응답을 기다리는 시간도 여기서 흡수)
  say(c.chewing, false);
  stage.classList.add('eating', `eat-${cat}`);
  const [res] = await Promise.all([ask, wait(calm.matches ? 300 : c.chew)]);
  stage.classList.remove('eating', `eat-${cat}`);

  // 3) 맛 평가
  if (res.limited) {
    say(c.slow);
  } else if (res.heavy) {
    say(res.line);
    $('#help').hidden = false;
  } else {
    state.eaten[cat] = eaten() + 1;
    state.menu[res.taste] = (state.menu[res.taste] || 0) + 1;
    save();
    render();
    react(res.taste);
    say(isFull() ? `${res.line} ${c.full}` : res.line);
  }
  busy = false;
  $('#feed-btn').disabled = isFull();
  $('#worry').disabled = isFull();
  if (!isFull()) $('#worry').focus();
}

// 선택 화면
$('#cat-list').innerHTML = Object.entries(CATS).map(([id, c]) => `
  <button class="pick" data-id="${id}" type="button">
    ${catSvg(id)}
    <span class="tag"><strong>${c.name}</strong><span>${c.tag}</span></span>
  </button>`).join('');
$('#cat-list').addEventListener('click', (e) => {
  const b = e.target.closest('.pick');
  if (b) choose(b.dataset.id);
});
$('#form').addEventListener('submit', feed);
$('#stage').addEventListener('click', petCat);
$('#stage').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); petCat(); }
});
$('#change').addEventListener('click', () => {
  if (busy) return;
  $('#feed').hidden = true;
  $('#select').hidden = false;
});
$('#sound').addEventListener('click', () => {
  soundOn = !soundOn;
  try { localStorage.setItem('nyam-sound', soundOn ? 'on' : 'off'); } catch {}
  renderSound();
});
renderSound();
