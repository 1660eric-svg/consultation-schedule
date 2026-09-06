# 학부모 상담 시간표

Vite와 React로 만든 학부모 상담 예약 웹앱의 시작 골격입니다.

## 시작하기

Node.js 20 이상을 설치한 뒤 아래 명령을 실행하세요.

```bash
npm install
npm run dev
```

터미널에 출력된 로컬 주소를 브라우저에서 열면 됩니다.

## Google Sheets + Apps Script 연결

서버나 별도 데이터베이스 없이 Google 스프레드시트를 상담 신청 저장소로 사용합니다.

1. 새 Google 스프레드시트를 만들고 URL에서 스프레드시트 ID를 복사합니다. (`/d/`와 `/edit` 사이 값)
2. 해당 스프레드시트에서 **확장 프로그램 → Apps Script**를 열고 [apps-script/Code.gs](apps-script/Code.gs)의 전체 코드를 붙여 넣습니다.
3. Apps Script의 **프로젝트 설정 → 스크립트 속성**에 아래 두 값을 만듭니다.
   - `SPREADSHEET_ID`: 1단계의 스프레드시트 ID
   - `TEACHER_PASSWORD`: 선생님 화면 비밀번호
4. 코드 편집기에서 `deployWebApp` 함수를 한 번 실행해 권한을 승인합니다.
5. **배포 → 새 배포 → 유형: 웹 앱**을 선택합니다. 실행 사용자는 `나`, 액세스 권한은 `모든 사용자`로 설정한 뒤 배포합니다.
6. 배포 URL 중 `/exec`로 끝나는 주소를 [src/config.js](src/config.js)의 `APPS_SCRIPT_URL`에 붙여 넣습니다.
7. `npm run build` 후 `dist` 폴더를 배포합니다.

Apps Script를 수정했다면 **새 버전을 배포**해야 변경 사항이 반영됩니다.

## 현재 구현된 기능

- 학부모: 자녀 이름, 희망 날짜, 희망 시간 제출
- 선생님: 상단 `선생님 모드`에서 신청 내역 조회 및 개별 삭제
- 신청 내역: Google 스프레드시트의 `상담신청` 시트에 저장
- 선생님 조회: Apps Script에서 비밀번호를 검증한 뒤 스프레드시트 내역을 반환

이 방식의 비밀번호 보호는 간단한 운영용입니다. 선생님 비밀번호와 학생 이름·상담 시간은 민감 정보일 수 있으므로, 공개 배포 전에는 학교의 개인정보 처리 방침을 확인하세요.

## 구조

- `src/App.jsx`: 화면의 최상위 컴포넌트
- `src/styles/`: 전역 및 앱 스타일
- `src/main.jsx`: React 앱 진입점
