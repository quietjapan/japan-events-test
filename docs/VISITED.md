# 다녀온 곳 (data/visited.json)

준호가 **직접 다녀온 곳**만 올리는 섹션이에요. 페이지 맨 아래 `#visited` (https://quietjapan.github.io/japan-events-test/#visited), 헤더의 「🧳 다녀온 곳」 링크와 모바일 ☰ 메뉴에서 이동해요. 비어 있으면 "11월 여행 다녀와서 채워질 예정이에요"가 보여요.

## 필드
| 필드 | 필수 | 설명 |
|---|---|---|
| `date` | ✅ | 방문일 `YYYY-MM-DD` |
| `name_ko` | ✅ | 장소·행사 이름 (한국어) |
| `name_ja` |  | 일본어 공식 이름 |
| `region` | ✅ | `tokyo` / `osaka` / `fukuoka` |
| `comment` | ✅ | **준호의 말 그대로** (다듬지 않음, 줄바꿈 `\n` 가능) |
| `rating` |  | 별점 1~5 정수 |
| `verdict` |  | 한 줄 평 (준호의 말) |
| `event_id` |  | 사이트 행사 id = 공유 페이지 `i/<id>/` 폴더명. 넣으면 「📅 행사 정보」 링크 + 목록 카드에 「다녀옴 ✓」 |
| `photos` |  | 준호 본인 사진만. repo 안 경로 (`visited/파일.webp`), 최대 4장 표시 |
| `blog_url` |  | 블로그 후기 주소 |
| `id` |  | 자동 생성 (`날짜-해시`) |

## 한 건 추가하는 순서
1. (사진이 있으면) `visited/`에 webp로 넣기 (가로 1200px 이하 권장)
2. (행사 연결 시) id 찾기: `grep -rl "행사이름" i/*/index.html` → 폴더명이 id
3. 추가:
   ```
   python3 tools/add_visited.py --date 2026-11-09 --region tokyo --name "MAPPA EXPO" --comment "준호가 한 말 그대로" --rating 5 --event-id <id> --blog https://blog.naver.com/rownsh00/...
   ```
   먼저 확인만 하려면 `--dry-run`, 목록은 `--list`, 삭제는 `--remove-id <id>`.
4. 빌드·푸시: `bash tools/build.sh && git add data/visited.json visited/ && git commit --author="JUNOFLO00 <JUNOFLO00@users.noreply.github.com>" -m "다녀온 곳: MAPPA EXPO" && git push`
   (candidates.json, inbox.md는 절대 커밋하지 않기. 테스트 사이트 먼저, 본 사이트는 준호 OK 후.)
