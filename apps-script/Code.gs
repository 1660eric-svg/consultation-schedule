/**
 * 상담 신청용 Google Apps Script 웹 앱
 *
 * 1. 연결할 스프레드시트에서 확장 프로그램 > Apps Script를 엽니다.
 * 2. 이 파일 전체를 붙여 넣습니다.
 * 3. 프로젝트 설정 > 스크립트 속성에서 아래 값을 만듭니다.
 *    - TEACHER_PASSWORD: 선생님 화면에 사용할 비밀번호
 *    - SPREADSHEET_ID: (선택) 독립형 Apps Script를 쓸 때만 스프레드시트 URL의 /d/ 와 /edit 사이 문자열
 * 4. deployWebApp()을 한 번 실행해 권한을 승인합니다.
 * 5. 배포 > 새 배포 > 웹 앱: 실행 사용자 '나', 액세스 권한 '모든 사용자'를 선택합니다.
 */

const SHEET_NAME = '상담신청'
const HEADERS = ['신청시각', '자녀 이름', '희망 날짜', '희망 시간']

function doGet(e) {
  const params = e.parameter || {}
  if (params.action !== 'list') return respond({ ok: false, message: '지원하지 않는 요청입니다.' }, params.callback)

  const expectedPassword = properties().getProperty('TEACHER_PASSWORD')
  if (!expectedPassword || params.password !== expectedPassword) {
    return respond({ ok: false, message: '비밀번호가 맞지 않습니다.' }, params.callback)
  }

  const sheet = getSheet()
  const values = sheet.getDataRange().getDisplayValues()
  const requests = values.slice(1).filter((row) => row[1]).map((row, index) => ({
    id: index + 2,
    childName: row[1],
    date: row[2],
    time: row[3],
  }))
  return respond({ ok: true, requests: requests }, params.callback)
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const childName = String(data.childName || '').trim()
    const date = String(data.date || '').trim()
    const time = String(data.time || '').trim()
    if (!childName || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return json({ ok: false, message: '입력값을 확인해 주세요.' })
    }

    const lock = LockService.getScriptLock()
    lock.waitLock(10000)
    try {
      const sheet = getSheet()
      const row = sheet.getLastRow() + 1
      sheet.getRange(row, 1, 1, 4).setNumberFormat('@').setValues([[new Date(), childName, date, time]])
    } finally {
      lock.releaseLock()
    }
    return json({ ok: true })
  } catch (error) {
    return json({ ok: false, message: error.message })
  }
}

function getSheet() {
  // 스프레드시트에서 "확장 프로그램 > Apps Script"로 만든 연결형 스크립트라면
  // 현재 스프레드시트를 사용하므로 별도 ID 설정이나 공유 권한 문제가 없습니다.
  const boundSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  if (boundSpreadsheet) {
    return getOrCreateSheet(boundSpreadsheet)
  }

  // 독립형 Apps Script 프로젝트인 경우에만 스크립트 속성의 ID를 사용합니다.
  const spreadsheetId = properties().getProperty('SPREADSHEET_ID')
  if (!spreadsheetId) throw new Error('독립형 Apps Script는 스크립트 속성 SPREADSHEET_ID를 설정해 주세요.')
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
  return getOrCreateSheet(spreadsheet)
}

function getOrCreateSheet(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME)
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    sheet.setFrozenRows(1)
  }
  return sheet
}

function properties() {
  return PropertiesService.getScriptProperties()
}

function respond(payload, callback) {
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(payload)})`).setMimeType(ContentService.MimeType.JAVASCRIPT)
  }
  return json(payload)
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)
}

// 처음 한 번 실행해 시트를 만들고 Apps Script 권한을 승인할 수 있습니다.
function deployWebApp() {
  getSheet()
}
