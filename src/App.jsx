import { useMemo, useState } from 'react'
import { APPS_SCRIPT_URL } from './config.js'
import './styles/app.css'

const timeSlots = ['15:00', '15:20', '15:40', '16:00', '16:20', '16:40', '17:00', '17:20']
const today = new Date().toISOString().slice(0, 10)

function formatDate(date) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null
  return parsed && !Number.isNaN(parsed) ? new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(parsed) : date
}

function hasEndpoint() {
  return APPS_SCRIPT_URL.startsWith('https://script.google.com/macros/s/')
}

// Apps Script ContentService는 JSONP 읽기를 지원합니다. 이는 선생님 목록 요청에만 사용합니다.
function requestJsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = `sheetCallback${Date.now()}${Math.random().toString(36).slice(2)}`
    const script = document.createElement('script')
    const timer = window.setTimeout(cleanup, 15000)
    function cleanup() { window.clearTimeout(timer); script.remove(); delete window[callback] }
    window[callback] = (data) => { cleanup(); resolve(data) }
    script.onerror = () => { cleanup(); reject(new Error('스프레드시트에 연결하지 못했습니다.')) }
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callback}`
    document.head.appendChild(script)
  })
}

function App() {
  const [view, setView] = useState('parent')
  const [requests, setRequests] = useState([])
  const [form, setForm] = useState({ childName: '', date: '', time: '' })
  const [notice, setNotice] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isTeacher, setIsTeacher] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const sortedRequests = useMemo(() => [...requests].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [requests])
  const updateForm = ({ target: { name, value } }) => setForm((current) => ({ ...current, [name]: value }))

  async function submitRequest(event) {
    event.preventDefault()
    if (!form.childName.trim() || !form.date || !form.time) return
    if (!hasEndpoint()) { setNotice('먼저 src/config.js에 Apps Script 웹 앱 URL을 입력해 주세요.'); return }
    setIsLoading(true); setNotice('')
    try {
      const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...form, childName: form.childName.trim() }) })
      const result = await response.json()
      if (!result.ok) throw new Error(result.message || '신청을 저장하지 못했습니다.')
      setNotice(`${form.childName.trim()} 학생의 상담 신청이 완료되었습니다.`)
      setForm({ childName: '', date: '', time: '' })
    } catch (error) {
      setNotice(error.message || '전송에 실패했습니다. 인터넷 연결과 Apps Script 배포 상태를 확인해 주세요.')
    } finally { setIsLoading(false) }
  }

  async function enterTeacherMode(event) {
    event.preventDefault()
    if (!hasEndpoint()) { setLoginError('먼저 src/config.js에 Apps Script 웹 앱 URL을 입력해 주세요.'); return }
    setIsLoading(true); setLoginError('')
    try {
      const url = `${APPS_SCRIPT_URL}${APPS_SCRIPT_URL.includes('?') ? '&' : '?'}action=list&password=${encodeURIComponent(password)}`
      const result = await requestJsonp(url)
      if (!result.ok) { setLoginError(result.message || '비밀번호가 맞지 않습니다.'); return }
      setRequests(result.requests || []); setIsTeacher(true); setPassword('')
    } catch (error) { setLoginError(error.message) } finally { setIsLoading(false) }
  }

  return <main className="app-shell">
    <header className="topbar"><button className="brand" type="button" onClick={() => setView('parent')}><span className="brand-mark">S</span><span>상담 시간표</span></button>{isTeacher ? <button className="text-button" type="button" onClick={() => { setIsTeacher(false); setView('parent') }}>학부모 화면으로</button> : <button className="text-button" type="button" onClick={() => setView('login')}>선생님 모드 →</button>}</header>
    {isTeacher ? <TeacherDashboard requests={sortedRequests} onRefresh={() => { setIsTeacher(false); setView('login') }} /> : view === 'login' ? <TeacherLogin password={password} error={loginError} isLoading={isLoading} onChange={(event) => setPassword(event.target.value)} onSubmit={enterTeacherMode} onBack={() => setView('parent')} /> : <ParentForm form={form} notice={notice} isLoading={isLoading} onChange={updateForm} onSubmit={submitRequest} />}
  </main>
}

function ParentForm({ form, notice, isLoading, onChange, onSubmit }) {
  return <section className="parent-layout" aria-labelledby="page-title"><div className="hero-copy"><p className="eyebrow">PARENT CONFERENCE · 2026</p><h1 id="page-title">상담하기 좋은<br />시간을 알려주세요.</h1><p>원하시는 날짜와 시간을 선택해 주세요.<br />신청 내용을 확인한 뒤 상담 일정을 안내드릴게요.</p><div className="info-card"><span className="info-icon">i</span><span>상담은 1회당 약 20분간 진행됩니다.</span></div></div><form className="booking-card" onSubmit={onSubmit}><div className="card-heading"><p>CONSULTATION REQUEST</p><h2>상담 신청</h2></div><label>자녀 이름<input name="childName" value={form.childName} onChange={onChange} placeholder="예: 김하늘" autoComplete="name" required /></label><label>희망 날짜<input name="date" type="date" min={today} value={form.date} onChange={onChange} required /></label><label>희망 시간<select name="time" value={form.time} onChange={onChange} required><option value="" disabled>시간을 선택해 주세요</option>{timeSlots.map((time) => <option key={time} value={time}>{time}</option>)}</select></label><button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? '전송 중...' : <>상담 신청하기 <span>→</span></>}</button>{notice && <p className="success-message" role="status">{notice}</p>}</form></section>
}

function TeacherLogin({ password, error, isLoading, onChange, onSubmit, onBack }) {
  return <section className="login-card" aria-labelledby="login-title"><button className="back-button" type="button" onClick={onBack}>← 돌아가기</button><p className="eyebrow">TEACHER ONLY</p><h1 id="login-title">선생님 모드</h1><p>스프레드시트에 저장된 상담 신청을 확인합니다.</p><form onSubmit={onSubmit}><label>비밀번호<input type="password" value={password} onChange={onChange} placeholder="비밀번호 입력" autoFocus required /></label>{error && <p className="error-message" role="alert">{error}</p>}<button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? '불러오는 중...' : '신청 내역 보기'}</button></form></section>
}

function TeacherDashboard({ requests, onRefresh }) {
  return <section className="dashboard" aria-labelledby="dashboard-title"><div className="dashboard-heading"><div><p className="eyebrow">TEACHER DASHBOARD</p><h1 id="dashboard-title">상담 신청 현황</h1><p>Google 스프레드시트에 저장된 신청 내역입니다.</p></div><div className="request-count"><strong>{requests.length}</strong>건 신청</div></div>{requests.length === 0 ? <div className="empty-state"><span>◌</span><h2>아직 신청된 상담이 없습니다.</h2><p>학부모가 상담을 신청하면 이곳에 표시됩니다.</p></div> : <div className="request-list">{requests.map((request, index) => <article className="request-row" key={request.id}><span className="number">{String(index + 1).padStart(2, '0')}</span><div className="student-name"><strong>{request.childName}</strong><span>학생</span></div><div className="schedule"><span>희망 상담 일시</span><strong>{formatDate(request.date)} · {request.time}</strong></div></article>)}</div>}<button className="refresh-button" type="button" onClick={onRefresh}>새로 불러오기</button></section>
}

export default App
