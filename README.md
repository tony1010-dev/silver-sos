# 🆘 실버 SOS

어르신을 위한 생활 도우미 웹 서비스. 매일 AI가 새 콘텐츠(퀴즈·이야기·수수께끼)를 자동 생성합니다.

## 폴더 구조

```
index.html                        ← 사이트 전체 (단일 파일)
content/generated.json            ← AI가 생성한 콘텐츠 누적 저장소 (사이트가 읽음)
scripts/generate-content.mjs      ← 콘텐츠 생성 스크립트
.github/workflows/daily-content.yml ← 매일 새벽 4시(한국시간) 자동 실행
```

## 설정 순서 (딱 4단계)

### 1. GitHub 저장소 만들기
- github.com에서 새 저장소 생성 (예: `silver-sos`)
- 이 폴더의 파일 전부 업로드 (`.github` 폴더 포함! 숨김 폴더 주의)

### 2. API 키 등록
- console.anthropic.com 에서 API 키 발급
- GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
- Name: `ANTHROPIC_API_KEY`, Value: 발급받은 키

### 3. Vercel 연결
- vercel.com → **Add New → Project → Import Git Repository** → 이 저장소 선택
- Framework Preset: **Other**, 설정 변경 없이 **Deploy**
- 끝. 이후 저장소에 커밋될 때마다 자동 재배포됨

### 4. 동작 테스트
- GitHub 저장소 → **Actions** 탭 → "매일 AI 콘텐츠 생성" → **Run workflow** (수동 실행)
- 1분쯤 뒤 `content/generated.json`에 새 콘텐츠가 커밋되면 성공
- 커밋되면 Vercel이 자동으로 재배포 → 사이트에 반영

## 동작 원리

```
매일 새벽 4시 → GitHub Actions 실행
  → Claude API 1회 호출 (퀴즈 5, 이야기 1, 수수께끼 3, 덕담 1, 대화주제 1)
  → 형식 검증 + 중복 제거
  → generated.json에 누적 저장 + 커밋
  → Vercel 자동 재배포
  → 사용자는 내장 콘텐츠 + 누적 생성 콘텐츠를 함께 봄
```

- 비용: 하루 1회 Haiku 호출 → **월 100원 미만**
- 생성 실패 시: 그날은 추가만 안 될 뿐, 사이트는 내장 데이터로 정상 동작
- 콘텐츠는 계속 누적되므로 시간이 지날수록 풍부해짐

## 참고

- 생성 시간 변경: `daily-content.yml`의 cron 수정 (UTC 기준, 한국시간 -9시간)
- 생성량 변경: `generate-content.mjs`의 프롬프트에서 개수 수정
- 도메인 연결: Vercel → Settings → Domains
