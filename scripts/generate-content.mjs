// 실버 SOS - 매일 AI 콘텐츠 자동 생성 스크립트
// GitHub Actions가 매일 실행. ANTHROPIC_API_KEY 환경변수 필요.
// 생성 결과는 content/generated.json에 누적 저장 (사이트가 이 파일을 읽음)

import fs from 'fs';

const FILE = 'content/generated.json';
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error('ANTHROPIC_API_KEY가 없습니다. GitHub Secrets에 등록하세요.'); process.exit(1); }

// ---------- 기존 데이터 읽기 ----------
let db = { updated: '', quizzes: [], stories: [], riddles: [], loves: [], topics: [] };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { /* 첫 실행 */ }

// 중복 방지용: 최근 생성분의 제목/질문만 프롬프트에 전달 (프롬프트 크기 절약)
const recentQuiz = db.quizzes.slice(-60).map(q => q.q);
const recentStory = db.stories.slice(-30).map(s => s.t);
const recentRiddle = db.riddles.slice(-60).map(r => r.q);

const PROMPT = `당신은 한국 노인복지 서비스 "실버 SOS"의 콘텐츠 작가입니다.
65세 이상 어르신을 위한 콘텐츠를 아래 JSON 형식으로만 출력하세요. JSON 외의 설명은 절대 쓰지 마세요.

{
  "quizzes": [ {"q":"문제","o":["보기1","보기2","보기3"],"a":정답인덱스(0~2)} ],  // 5개
  "stories": [ {"t":"제목","s":"이야기 본문"} ],  // 1개
  "riddles": [ {"q":"수수께끼","a":"정답"} ],  // 3개
  "loves":   [ "손주에게 보낼 따뜻한 말 한마디" ],  // 1개
  "topics":  [ "손주와 대화를 트는 질문" ]  // 1개
}

규칙:
- quizzes: 치매예방용 상식퀴즈. 속담 완성, 한국 역사, 명절, 자연상식 등. 정답이 명확하고 논란 없는 문제만. 어르신이 아는 소재로.
- stories: 손주에게 들려줄 전래동화·이솝우화를 할머니/할아버지 말투("~했단다")로 4~5문장 요약. 교훈으로 마무리.
- riddles: 초등학생 손주와 함께 즐길 재미있는 한국어 수수께끼(언어유희).
- loves: 존댓말 아닌 다정한 반말. 손주가 들으면 기분 좋을 말.
- 폭력적·무서운 내용, 정치·종교, 노인 비하 금지.
- 아래 목록과 겹치지 않는 새로운 것만 만들 것.

이미 있는 퀴즈: ${JSON.stringify(recentQuiz)}
이미 있는 이야기: ${JSON.stringify(recentStory)}
이미 있는 수수께끼: ${JSON.stringify(recentRiddle)}`;

// ---------- Claude API 호출 ----------
const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5',   // 저렴한 모델로 충분
    max_tokens: 2000,
    messages: [{ role: 'user', content: PROMPT }],
  }),
});
if (!res.ok) { console.error('API 오류:', res.status, await res.text()); process.exit(1); }
const data = await res.json();
let text = data.content?.[0]?.text ?? '';

// JSON 부분만 추출 (앞뒤에 다른 말이 붙어도 견디게)
const m = text.match(/\{[\s\S]*\}/);
if (!m) { console.error('JSON을 찾지 못했습니다:', text.slice(0, 200)); process.exit(1); }
let gen;
try { gen = JSON.parse(m[0]); } catch (e) { console.error('JSON 파싱 실패:', e.message); process.exit(1); }

// ---------- 검증 + 중복 제거 후 누적 ----------
let added = { quizzes: 0, stories: 0, riddles: 0, loves: 0, topics: 0 };

for (const q of gen.quizzes ?? []) {
  if (q && typeof q.q === 'string' && q.q.length > 2
      && Array.isArray(q.o) && q.o.length === 3 && q.o.every(o => typeof o === 'string' && o.length > 0)
      && Number.isInteger(q.a) && q.a >= 0 && q.a < 3
      && !db.quizzes.some(x => x.q === q.q)) {
    db.quizzes.push({ q: q.q, o: q.o, a: q.a }); added.quizzes++;
  }
}
for (const s of gen.stories ?? []) {
  if (s && typeof s.t === 'string' && typeof s.s === 'string' && s.s.length > 30
      && !db.stories.some(x => x.t === s.t)) {
    db.stories.push({ t: s.t, s: s.s }); added.stories++;
  }
}
for (const r of gen.riddles ?? []) {
  if (r && typeof r.q === 'string' && typeof r.a === 'string' && r.q.length > 2
      && !db.riddles.some(x => x.q === r.q)) {
    db.riddles.push({ q: r.q, a: r.a }); added.riddles++;
  }
}
for (const l of gen.loves ?? []) {
  if (typeof l === 'string' && l.length > 5 && !db.loves.includes(l)) { db.loves.push(l); added.loves++; }
}
for (const t of gen.topics ?? []) {
  if (typeof t === 'string' && t.length > 5 && !db.topics.includes(t)) { db.topics.push(t); added.topics++; }
}

const total = Object.values(added).reduce((a, b) => a + b, 0);
if (total === 0) { console.error('추가된 콘텐츠가 없습니다 (전부 중복이거나 형식 오류).'); process.exit(1); }

db.updated = new Date().toISOString();
fs.writeFileSync(FILE, JSON.stringify(db, null, 1), 'utf8');
console.log('추가됨:', JSON.stringify(added),
  '| 누적: 퀴즈', db.quizzes.length, '이야기', db.stories.length, '수수께끼', db.riddles.length);
