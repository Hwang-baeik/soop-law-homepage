# 네이버웍스 업무 안내 봇 연결

Vercel의 Next.js API가 네이버웍스 Callback을 받아 응답한다. PC나 웹페이지를 켜 둘 필요가 없다. 할 일 등록 기능은 포함하지 않는다.

| 메시지에 포함된 키워드 | 응답 |
| --- | --- |
| `#안내완료` | 정보 취합 후 서류작성 해야합니다. |
| `#서류작성완료` | 날인 및 접수준비를 해야합니다. |
| `#비용확인` | 비용이 확인되었습니다. |
| `#접수완료` | 완료, 보정 등 대기 중입니다. |
| `#등기완료` | 등기완료서류 준비를 해야합니다. |
| `#완료서류발송` | 업무 정리를 해야합니다. |

문장 안의 키워드도 감지하며, 한 메시지에 여러 종류가 있으면 각각 응답한다. 같은 메시지에 같은 키워드가 반복되어도 해당 응답은 한 번 보낸다. 별개의 메시지로 다시 입력하면 다시 응답한다. 봇 초대 시 방별 최초 1회 사용 안내를 보낸다. 퇴장·재초대·재배포 후에도 최초 안내 기록을 유지한다. 1:1 대화는 처리하지 않는다.

같은 줄에서 키워드 바로 앞에 `YYYY-MM-DD` 형식의 날짜를 적으면 답장 맨 앞에 날짜와 키워드를 표시한다. 예를 들어 `2026-11-06 #등기완료`에는 `2026-11-06 #등기완료 · 등기완료서류 준비를 해야합니다.`라고 답한다.

## 1. 네이버웍스 관리자 설정

1. [Developers Console](https://developers.worksmobile.com/kr/console)에서 API용 OAuth 앱을 생성한다.
2. 앱의 OAuth Scopes에 `bot.message`를 추가한다.
3. Service Account와 Private Key를 발급한다. Client ID, Client Secret도 확인한다.
4. Bot을 추가하고 ‘조직/그룹, 1:N 메시지방 초대 가능’을 활성화한다. Bot ID와 Bot Secret을 확인한다. API 앱과 Bot은 별도 항목이다.
5. Callback을 활성화한다. text 메시지 수신과 `message`, `join` 이벤트를 활성화한다.
6. 코드를 운영 배포한 뒤 Callback URL에 `https://sooplaw.com/api/naverworks/callback`을 입력한다.
7. 네이버웍스 Admin → 서비스 → Bot에서 봇을 추가하고 구성원에게 사용 권한을 부여한다.

비밀키는 채팅·소스 코드·브라우저 코드에 붙여 넣지 않는다. 아래 Vercel 서버 환경 변수에 입력한다.

## 2. 최초 안내 및 발송 기록 저장소

Vercel 프로젝트 → Storage / Marketplace에서 Upstash Redis를 연결한다. 운영용으로 유지되는 데이터베이스를 사용한다. 기간 제한 체험 DB는 사용하지 않는다. 저장소의 eviction(용량 부족 시 자동 삭제)을 끄고 충분한 용량을 확보한다. 최초 안내 기록이 삭제되면 다시 안내할 수 있다.

기존 Vercel Marketplace 연결이 `KV_REST_API_URL`, `KV_REST_API_TOKEN` 이름으로 등록되어 있어도 그대로 사용할 수 있다. 이때 `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`을 중복 등록할 필요가 없다. 읽기 전용 토큰은 사용할 수 없다.

저장하는 정보는 봇 ID, 대상 채널 ID, 정해진 안내 문구, 발송 상태이다. 직원의 원문 메시지와 이름은 저장하지 않는다. 키워드 응답 기록은 24시간 뒤 만료되고 최초 안내 기록에는 만료를 설정하지 않는다. 원문 이벤트의 SHA-256 해시를 중복 식별에 사용한다.

## 3. Vercel 환경 변수

`soop-law-homepage` → Settings → Environment Variables → **Production**에 다음을 등록한다. Preview에서 실봇과 실저장소를 공유하지 않는다.

| 이름 | 입력 값 |
| --- | --- |
| `NAVERWORKS_BOT_ID` | Bot ID |
| `NAVERWORKS_BOT_SECRET` | Bot Secret |
| `NAVERWORKS_CLIENT_ID` | OAuth 앱 Client ID |
| `NAVERWORKS_CLIENT_SECRET` | OAuth 앱 Client Secret |
| `NAVERWORKS_SERVICE_ACCOUNT` | Service Account 이메일 형태 ID |
| `NAVERWORKS_PRIVATE_KEY` | 발급한 개인 키 전체, BEGIN/END 줄 포함 |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST 쓰기 가능 토큰 |
| `NAVERWORKS_RETRY_SECRET` | 선택 사항: 운영자 재처리용 충분히 긴 임의 비밀값 |

Private Key는 실제 줄바꿈 또는 `\n` 문자열 형식 모두 지원한다. 환경 변수 등록 후 재배포해야 적용된다. 설정 전에는 Callback이 503을 반환한다. `NEXT_PUBLIC_` 접두사를 사용하지 않는다.

운영 도메인 `sooplaw.com`은 현재 Vercel 인증 보호 대상이 아니다. 네이버웍스가 로그인 없이 접근할 수 있는 이 도메인을 사용한다. 개발·미리보기 주소는 Vercel 인증으로 차단될 수 있다. 사용자 문의용 BotID 검증을 Callback에 적용하면 네이버웍스 요청도 차단되므로, 봇 API는 HMAC 서명으로 별도 검증한다.

## 4. 운영 배포 후 실제 확인

1. 테스트용 그룹방에 봇을 초대해 최초 안내가 한 번 오는지 확인한다.
2. 표에 있는 키워드를 각각 입력해 해당 문구가 오는지 확인한다.
3. 문장 속 키워드, 한 메시지의 여러 키워드, 새 메시지로 같은 키워드를 반복하는 경우를 확인한다.
4. 키워드 없는 메시지에는 응답하지 않는지 확인한다.
5. 봇을 내보냈다가 다시 초대해 최초 안내가 반복되지 않는지 확인한다.
6. Vercel 로그에서 `naverworks_*failed`, `naverworks_delivery_rejected`, `naverworks_delivery_uncertain` 오류를 확인한다.

## 장애와 재처리

서명을 검증한 뒤 발송 작업을 Redis에 저장하고 HTTP 200을 반환한다. 발송은 Next.js `after()`로 이어 처리한다. 네이버웍스는 Callback 실패 시 재전송하지 않으므로, 저장소 장애·Vercel 접근 차단 등으로 수신 자체에 실패한 메시지는 누락될 수 있다.

인증 실패 및 명확한 API 거절은 pending으로 남는다. 다음 처리 대상 Callback이 오면 등록된 키워드 수만큼 오래된 작업부터 처리한다. 아직 처리할 pending이 남아 있거나 중단된 `after()` 작업을 복구하려면 운영자가 `POST /api/naverworks/retry`를 호출한다. Authorization 헤더에 `Bearer <NAVERWORKS_RETRY_SECRET>`을 넣는다. 이 경로는 비밀값 설정 전에는 사용할 수 없다. 별도 주기 실행은 설정하지 않았다.

전송 타임아웃 및 API 5xx 응답은 이미 전달되었을 가능성이 있어 자동 재전송하지 않고 `uncertain`으로 남긴다. 발송 도중 함수가 종료되면 `sending`으로 남을 수 있다. 대화방의 실제 수신 여부를 확인한 후 Redis에서 해당 작업의 상태를 `sent`로 확정하거나, `pending`으로 바꾸고 `naverworks:<Bot ID>:pending` 정렬 집합에 작업 키를 추가해 재처리한다. 이 두 작업은 운영자만 수행한다. 외부 메시지 전송과 저장소 기록 사이에 트랜잭션이 없으므로 장애 상황의 ‘정확히 한 번 전달’을 보장하지 않는다.

## 공식 문서

- [Callback 및 서명 검증](https://developers.worksmobile.com/kr/docs/bot-callback)
- [봇 초대 이벤트](https://developers.worksmobile.com/kr/docs/bot-callback-join)
- [서비스 계정 인증](https://developers.worksmobile.com/kr/docs/auth-jwt)
- [채널 메시지 보내기](https://developers.worksmobile.com/kr/docs/bot-channel-message-send)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Upstash REST API](https://upstash.com/docs/redis/features/restapi)
