import { FormEvent, useState } from 'react'
import { Patient, Outcome } from './types'
import { useApp } from './store'
import { Badge, Chart, Stat, Tbl, ini } from './ui'
import { BEDS, USERS, attn, elig, fmt, nm, occ, stats, tDone, tToday, today, vDone } from './lib'

const PName = ({ p }: { p: Patient }) => {
  const { go } = useApp()
  return <button className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-2 text-left" onClick={() => go('detail', p.id)}><span className="av !w-7 !h-7 text-xs">{ini(p.name)}</span>{p.name}</button>
}
const Done = ({ v }: { v: boolean }) => v ? <Badge k="ok">Done</Badge> : <Badge k="wa">Pending</Badge>
const Status = ({ p }: { p: Patient }) => p.status === 'discharged' ? <Badge>{p.outcome === 'deceased' ? 'Deceased' : 'Discharged'}</Badge> : p.rec?.status === 'pending' ? <Badge k="in">Discharge recommended</Badge> : <Badge k="ok">Admitted</Badge>
export function useMine(): Patient[] {
  const { db, user } = useApp()
  return db.patients.filter(p => p.status === 'admitted' && (user!.role === 'admin' || (user!.role === 'nurse' ? p.nurse : p.doctor) === user!.id))
}

export function Login() {
  const { login } = useApp()
  const D = { nurse: ['🩺', 'Record temperatures and track daily tasks'], doctor: ['👨‍⚕️', 'Review trends, add consultations, recommend discharge'], admin: ['🗂️', 'Admit patients, manage beds, confirm discharges'] }
  return <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#0b2a6b,#2563eb 60%,#60a5fa)' }}><main className="max-w-5xl mx-auto p-4 pt-10 md:pt-20 text-white">
    <div className="flex items-center gap-3"><div className="ic bg-white/20">🏥</div><h1 className="text-3xl md:text-4xl font-bold">CareTrack</h1></div>
    <p className="mt-2 text-blue-100 max-w-xl">Daily temperature monitoring, doctor visits, bed management and safe discharge workflows in one place.</p>
    <h2 className="font-semibold mt-8 mb-3">Choose a demo role</h2>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{Object.values(USERS).map(u => <button key={u.id} onClick={() => login(u.id)} className="card text-left text-slate-900 hover:-translate-y-1 transition">
      <div className="text-3xl">{D[u.role][0]}</div><b className="block mt-2">{u.name}</b><Badge k="in">{u.role === 'admin' ? 'Administrative staff' : u.role[0].toUpperCase() + u.role.slice(1)}</Badge><p className="text-sm text-slate-600 mt-2">{D[u.role][1]}</p></button>)}</div>
    <p className="text-sm text-blue-100 mt-6">Demo mode · fictional patients · data saved in this browser only · no passwords</p></main></div>
}

export function Dashboard() {
  const { user, db, go } = useApp(), m = useMine(), r = user!.role
  const pend = r === 'nurse' ? m.filter(p => !tDone(p)) : m.filter(p => !vDone(p))
  const o = Object.keys(occ(db)).length, pd = db.patients.filter(p => p.rec?.status === 'pending')
  const cards = r === 'nurse' ? [['Assigned patients', m.length], ['Temperatures done today', m.length - pend.length, 'text-green-700'], ['Pending temperatures', pend.length, 'text-amber-600'], ['Need attention', m.filter(attn).length, 'text-red-700']]
    : r === 'doctor' ? [['Patients under care', m.length], ['Visits pending today', pend.length, 'text-amber-600'], ['Visits completed today', m.length - pend.length, 'text-green-700'], ['Potentially eligible for discharge', m.filter(p => elig(p).ok && !p.rec).length, 'text-blue-700']]
    : [['Admitted patients', m.length], ['Occupied beds', o], ['Available beds', BEDS.length - o, 'text-green-700'], ['Pending discharge requests', pd.length, 'text-amber-600']]
  const pr = r === 'admin' ? [o, BEDS.length, 'Bed occupancy'] : r === 'nurse' ? [m.length - pend.length, m.length, 'Temperatures recorded today'] : [m.length - pend.length, m.length, 'Doctor visits completed today']
  const pc = pr[1] ? Math.round((+pr[0] / +pr[1]) * 100) : 0
  return <><div className="mb-5"><h2 className="text-2xl font-bold">Welcome, {user!.name}</h2><p className="text-slate-500 text-sm">Here is what needs your attention today.</p></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(c => <Stat key={c[0] as string} l={c[0] as string} v={c[1]} c={c[2] as string | undefined} />)}</div>
    <div className="card mt-4"><div className="flex justify-between text-sm mb-2"><b>{pr[2]}</b><span>{pr[0]}/{pr[1]} · {pc}%</span></div><div className="bar"><i style={{ width: `${pc}%` }} /></div></div>
    {r === 'admin' && pd.length > 0 && <div className="card mt-4 !border-amber-300 !border-2">🔔 <b>{pd.length} discharge recommendation(s) awaiting review.</b> <button className="btn ml-2" onClick={() => go('disc')}>Review</button></div>}
    {r !== 'admin' && <div className="card mt-4"><h3 className="font-bold mb-2">{r === 'nurse' ? 'Pending temperature measurements' : 'Patients awaiting a doctor visit'}</h3>
      <Tbl head={['Patient', 'Bed', r === 'nurse' ? 'Today' : 'Latest temp', '']} empty="All done for today." rows={pend.map(p => { const l = [...p.temps].sort((a, b) => (a.t < b.t ? 1 : -1))[0]; return [<PName p={p} />, p.bed, r === 'nurse' ? 'No reading' : l ? `${l.c.toFixed(1)}°C` : '—', <button className="btn" onClick={() => go('detail', p.id)}>{r === 'nurse' ? 'Record' : 'Visit'}</button>] })} /></div>}
    {r === 'nurse' && m.some(attn) && <div className="card mt-4 !border-red-300"><b className="text-red-700">Fever today:</b> {m.filter(attn).map(p => <span key={p.id} className="mr-3"><PName p={p} /></span>)}</div>}</>
}

export function Patients() {
  const { user, db } = useApp()
  const [q, setQ] = useState(''), [f, setF] = useState('all')
  const all = user!.role === 'admin' ? db.patients : db.patients.filter(p => (user!.role === 'nurse' ? p.nurse : p.doctor) === user!.id)
  const rows = all.filter(p => `${p.name}${p.id}${p.bed ?? ''}`.toLowerCase().includes(q.toLowerCase()) && (f === 'all' || (f === 'adm' && p.status === 'admitted') || (f === 'dis' && p.status === 'discharged') || (f === 'tp' && p.status === 'admitted' && !tDone(p)) || (f === 'vp' && p.status === 'admitted' && !vDone(p)) || (f === 'rec' && p.rec?.status === 'pending')))
  return <><h2 className="text-xl font-bold mb-3">{user!.role === 'admin' ? 'All patients' : 'My patients'}</h2><div className="card">
    <div className="grid sm:grid-cols-3 gap-2 mb-3"><div className="sm:col-span-2"><label htmlFor="q">Search by name, ID or bed</label><input id="q" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Asha, P1003, B4" /></div>
      <div><label htmlFor="f">Filter</label><select id="f" value={f} onChange={e => setF(e.target.value)}>{[['all', 'All'], ['adm', 'Admitted'], ['dis', 'Discharged'], ['tp', 'Temperature pending'], ['vp', 'Visit pending'], ['rec', 'Discharge recommended']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
    <Tbl head={['ID', 'Patient', 'Age/Sex', 'Bed', 'Admitted', 'Temp today', 'Visit today', 'Status']} empty="No patients match your search or filter."
      rows={rows.map(p => [p.id, <PName p={p} />, `${p.age}/${p.gender[0]}`, p.bed ?? '—', p.admitted, p.status === 'admitted' ? <Done v={tDone(p)} /> : '—', p.status === 'admitted' ? <Done v={vDone(p)} /> : '—', <Status p={p} />])} /></div></>
}

function TempForm({ p, quick }: { p: Patient; quick?: boolean }) {
  const a = useApp(), [c, setC] = useState(''), [n, setN] = useState('')
  const sub = async (e: FormEvent) => {
    e.preventDefault(); const v = parseFloat(c)
    if (!(v >= 30 && v <= 45)) return a.toast('Enter a temperature between 30.0 and 45.0 °C.', 'er')
    if (tDone(p) && !(await a.ask(`A reading was already recorded today (${tToday(p).map(x => `${x.c.toFixed(1)}°C @ ${x.t.slice(11)}`).join(', ')}). Save an additional reading?`, 'Save additional'))) return
    if (a.addTemp(p.id, v, n)) { setC(''); setN('') }
  }
  if (quick) return <form onSubmit={sub} className="flex gap-1 items-center"><input type="number" step="0.1" min="30" max="45" required placeholder="°C" aria-label={`Temperature for ${p.name}`} style={{ width: 84 }} value={c} onChange={e => setC(e.target.value)} /><button className="btn !py-1">Save</button></form>
  return <form onSubmit={sub} className="card"><h3 className="font-bold mb-2">Record temperature</h3><label htmlFor="tc">Temperature (°C)</label><input id="tc" type="number" step="0.1" min="30" max="45" required placeholder="36.8" value={c} onChange={e => setC(e.target.value)} />
    <label className="mt-2" htmlFor="tn">Notes (optional)</label><textarea id="tn" rows={2} maxLength={300} value={n} onChange={e => setN(e.target.value)} /><p className="text-xs text-slate-500 my-2">Date and time are captured automatically when you save.</p><button className="btn">Save reading</button></form>
}
function VisitForm({ p }: { p: Patient }) {
  const a = useApp(), [t, setT] = useState(''), [pl, setPl] = useState(''), [d, setD] = useState(true)
  const sub = (e: FormEvent) => { e.preventDefault(); if (a.addVisit(p.id, t, pl, d)) { setT(''); setPl('') } }
  return <form onSubmit={sub} className="card"><h3 className="font-bold mb-2">Consultation</h3><label htmlFor="vn">Consultation notes</label><textarea id="vn" rows={3} required maxLength={800} value={t} onChange={e => setT(e.target.value)} />
    <label className="mt-2" htmlFor="vp">Treatment decision</label><textarea id="vp" rows={2} required maxLength={500} value={pl} onChange={e => setPl(e.target.value)} />
    <label className="mt-2 flex gap-2 items-center"><input type="checkbox" style={{ width: 'auto' }} checked={d} onChange={e => setD(e.target.checked)} /> Mark today's visit as completed</label><button className="btn mt-2">Save consultation</button></form>
}
function Eligibility({ p }: { p: Patient }) {
  const a = useApp(), e = elig(p)
  const rec = async () => { if (await a.ask(<>Submit a discharge <b>recommendation</b> for {p.name}? Administration will be notified. This is not a discharge.</>, 'Submit')) a.recommend(p.id) }
  return <div className={`card ${e.ok ? '!border-green-400' : ''}`}><h3 className="font-bold mb-1">Discharge eligibility <Badge k={e.ok ? 'ok' : 'gr'}>{e.ok ? 'Meets criteria' : 'Not yet eligible'}</Badge></h3>
    <p className="text-xs text-slate-500 mb-2">Rule: each of the 3 most recent complete days (before today) needs at least one reading and every reading below 38.0°C. Missing readings never count as fever-free; a fever reading today also blocks. This is a recommendation for clinical review, not a diagnosis or authorization.</p>
    <ul className="text-sm space-y-1">{e.days.map(d => <li key={d.d}>{d.d}: {d.s === 'ok' ? <Badge k="ok">Fever-free ({d.n} reading{d.n > 1 ? 's' : ''})</Badge> : d.s === 'fever' ? <Badge k="er">Fever recorded</Badge> : <Badge k="wa">No readings — does not count</Badge>}</li>)}{e.tf && <li><Badge k="er">Fever reading today</Badge></li>}</ul>
    {a.user!.role === 'doctor' && p.doctor === a.user!.id && p.status === 'admitted' && (p.rec ? <p className="mt-2 text-sm"><Badge k="in">Recommendation {p.rec.status} · {fmt(p.rec.t)}</Badge></p> : e.ok && <button className="btn mt-3" onClick={rec}>Recommend discharge to administration</button>)}</div>
}
export function Detail() {
  const { db, pid, go, user } = useApp(), p = db.patients.find(x => x.id === pid)
  if (!p) return <p>Patient not found.</p>
  const r = user!.role, mine = p.status === 'admitted' && (r === 'nurse' ? p.nurse : p.doctor) === user!.id
  const q = [...p.temps].sort((a, b) => (a.t < b.t ? 1 : -1)), l = q[0], mx = q.length ? Math.max(...q.map(x => x.c)) : null
  const dy = Math.max(1, Math.round((+new Date(p.discharged ?? today()) - +new Date(p.admitted)) / 864e5))
  return <><button className="btn g mb-3" onClick={() => go('patients')}>← Back</button>
    <div className="card mb-3"><div className="flex flex-wrap justify-between gap-3"><div className="flex gap-3"><div className="av !w-14 !h-14 text-lg">{ini(p.name)}</div><div><h2 className="text-xl font-bold">{p.name} <span className="text-slate-500 text-base">{p.id}</span></h2>
      <p className="text-sm text-slate-600">{p.age} yrs · {p.gender} · Bed {p.bed ?? `— (was ${p.lastBed ?? 'n/a'})`} · Admitted {p.admitted}{p.discharged ? ` · Discharged ${p.discharged}` : ''}</p><p className="text-sm text-slate-600">Nurse: {nm(p.nurse)} · Doctor: {nm(p.doctor)}</p></div></div>
      <div className="text-right"><Status p={p} /><div className="mt-1 text-sm">Temp today: <Done v={tDone(p)} /> Visit: <Done v={vDone(p)} /></div></div></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3"><Stat l="Latest temperature" v={l ? `${l.c.toFixed(1)}°C` : '—'} c={l && l.c >= 38 ? 'text-red-700' : 'text-green-700'} i="🌡️" bg={l && l.c >= 38 ? 'bg-red-50' : 'bg-green-50'} /><Stat l="Peak recorded" v={mx ? `${mx.toFixed(1)}°C` : '—'} i="📈" /><Stat l="Days in hospital" v={dy} i="📅" /><Stat l="Total readings" v={p.temps.length} i="🧾" /></div>
    <div className="grid lg:grid-cols-2 gap-3">{r === 'nurse' && mine && <TempForm p={p} />}{r === 'doctor' && mine && <VisitForm p={p} />}{(r !== 'admin' || p.rec) && <Eligibility p={p} />}</div>
    <div className="card mt-3"><h3 className="font-bold mb-2">Temperature trend</h3><Chart p={p} /></div>
    <div className="card mt-3"><h3 className="font-bold mb-2">Temperature history</h3><Tbl head={['Date & time', '°C', 'Status', 'Notes', 'By']} empty="No temperature readings yet." rows={q.map(x => [fmt(x.t), <b>{x.c.toFixed(1)}</b>, x.c >= 38 ? <Badge k="er">Fever</Badge> : <Badge k="ok">Normal</Badge>, x.note, nm(x.by)])} /></div>
    <div className="card mt-3"><h3 className="font-bold mb-2">Consultation notes &amp; decisions</h3>{p.notes.length ? p.notes.map((n, i) => <div key={i} className="border-b py-2 text-sm"><b>{fmt(n.t)} · {nm(n.by)}</b><p>{n.text}</p><p className="text-slate-600"><i>Decision:</i> {n.plan}</p></div>) : <p className="text-slate-500 text-sm">No notes yet.</p>}</div></>
}

export function Tasks() {
  const m = useMine(), { user } = useApp(), { go } = useApp()
  return <><h2 className="text-xl font-bold mb-3">Daily task tracking — {today()}</h2><div className="card"><Tbl head={['Patient', 'Bed', 'Temperature', 'Doctor visit', 'Latest reading', user!.role === 'nurse' ? 'Quick record' : '']} empty="No assigned patients."
    rows={m.map(p => { const l = tToday(p).slice(-1)[0]; return [<PName p={p} />, p.bed, <Done v={tDone(p)} />, <Done v={vDone(p)} />, l ? `${l.c.toFixed(1)}°C @ ${l.t.slice(11)}` : '—', user!.role === 'nurse' ? <TempForm p={p} quick /> : <button className="btn g" onClick={() => go('detail', p.id)}>Open</button>] })} />
    <p className="text-xs text-slate-500 mt-2">A temperature task completes automatically once a valid reading is saved. Visits are tracked separately.</p></div></>
}

function DischargeRow({ p }: { p: Patient }) {
  const a = useApp(), [o, setO] = useState<Outcome>('recovered')
  const go = async () => { if (await a.ask(<>Confirm discharge of <b>{p.name}</b> as <b>{o}</b>? Bed {p.bed} will be released. Records are preserved.</>, 'Confirm discharge')) a.discharge(p.id, o) }
  return <tr><td><PName p={p} /></td><td>{p.bed}</td><td>{nm(p.rec!.by)}</td><td>{fmt(p.rec!.t)}</td><td>{elig(p).ok ? <Badge k="ok">Still met</Badge> : <Badge k="wa">Re-check</Badge>}</td>
    <td><select aria-label="Outcome" value={o} onChange={e => setO(e.target.value as Outcome)} style={{ width: 130 }}><option value="recovered">Recovered</option><option value="deceased">Deceased</option></select></td><td><button className="btn" onClick={go}>Confirm discharge</button></td></tr>
}
export function Discharges() {
  const { user, db, go } = useApp(), m = useMine()
  if (user!.role === 'doctor') return <><h2 className="text-xl font-bold mb-3">Discharge review</h2><div className="card"><Tbl head={['Patient', 'Last 3 complete days', 'Criteria', 'Recommendation', '']}
    rows={m.map(p => { const e = elig(p); return [<PName p={p} />, e.days.map(d => d.s === 'ok' ? '✔' : d.s === 'fever' ? '🌡' : '∅').join(' '), e.ok ? <Badge k="ok">Met</Badge> : <Badge>Not met</Badge>, p.rec ? <Badge k="in">{p.rec.status}</Badge> : '—', <button className="btn g" onClick={() => go('detail', p.id)}>Review</button>] })} />
    <p className="text-xs text-slate-500 mt-2">✔ fever-free · 🌡 fever · ∅ missing (does not count). Open a patient to submit a recommendation.</p></div></>
  const pd = db.patients.filter(p => p.rec?.status === 'pending' && p.status === 'admitted'), h = db.patients.filter(p => p.status === 'discharged')
  return <><h2 className="text-xl font-bold mb-3">Discharge requests</h2><div className="card mb-3"><h3 className="font-bold mb-2">Pending recommendations</h3>
    <div className="overflow-x-auto"><table className="w-full"><thead><tr>{['Patient', 'Bed', 'Recommended by', 'Date', 'Eligibility', 'Outcome', ''].map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{pd.length ? pd.map(p => <DischargeRow key={p.id} p={p} />) : <tr><td colSpan={7} className="text-slate-500 p-6 text-center">No pending discharge recommendations.</td></tr>}</tbody></table></div></div>
    <div className="card"><h3 className="font-bold mb-2">Discharge history</h3><Tbl head={['Patient', 'Admitted', 'Discharged', 'Bed released', 'Outcome']} empty="No discharges yet." rows={h.map(p => [<PName p={p} />, p.admitted, p.discharged, p.lastBed ?? '—', p.outcome === 'deceased' ? <Badge k="er">Deceased</Badge> : <Badge k="ok">Recovered</Badge>])} /></div></>
}

export function Beds() {
  const { db } = useApp(), o = occ(db), n = Object.keys(o).length
  return <><h2 className="text-xl font-bold mb-3">Bed occupancy</h2><p className="mb-3 text-sm">{n} occupied · {BEDS.length - n} available</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{BEDS.map(b => <div key={b} className={`card ${o[b] ? '' : '!border-green-400'}`}><b>{b}</b> <Badge k={o[b] ? 'er' : 'ok'}>{o[b] ? 'Occupied' : 'Available'}</Badge><div className="text-sm mt-1">{o[b] ? <PName p={o[b]} /> : '—'}</div></div>)}</div></>
}

export function Admit() {
  const { db, admit, go } = useApp(), free = BEDS.filter(b => !occ(db)[b])
  const [f, setF] = useState({ pid: `P${1000 + db.patients.length + 1}`, name: '', age: '', gender: 'Female', date: today(), bed: free[0] ?? '', nurse: 'n1', doctor: 'd1' })
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const sub = (e: FormEvent) => { e.preventDefault(); if (admit({ ...f, age: Number(f.age) })) go('patients') }
  const opt = (r: string) => Object.values(USERS).filter(u => u.role === r).map(u => <option key={u.id} value={u.id}>{u.name}</option>)
  return <><h2 className="text-xl font-bold mb-3">Admit new patient</h2><form className="card grid sm:grid-cols-2 gap-3 max-w-2xl" onSubmit={sub}>
    <div><label htmlFor="an">Full name</label><input id="an" required maxLength={80} value={f.name} onChange={set('name')} /></div>
    <div><label htmlFor="ai">Patient ID</label><input id="ai" required pattern="P[0-9]{4,}" value={f.pid} onChange={set('pid')} /></div>
    <div><label htmlFor="aa">Age</label><input id="aa" type="number" min={0} max={120} required value={f.age} onChange={set('age')} /></div>
    <div><label htmlFor="ag">Gender</label><select id="ag" value={f.gender} onChange={set('gender')}><option>Female</option><option>Male</option><option>Other</option></select></div>
    <div><label htmlFor="ad">Admission date</label><input id="ad" type="date" required max={today()} value={f.date} onChange={set('date')} /></div>
    <div><label htmlFor="ab">Bed (available only)</label><select id="ab" required value={f.bed} onChange={set('bed')}>{free.length ? free.map(b => <option key={b}>{b}</option>) : <option value="">No beds available</option>}</select></div>
    <div><label htmlFor="un">Nurse</label><select id="un" value={f.nurse} onChange={set('nurse')}>{opt('nurse')}</select></div>
    <div><label htmlFor="ud">Doctor</label><select id="ud" value={f.doctor} onChange={set('doctor')}>{opt('doctor')}</select></div>
    <div className="sm:col-span-2"><button className="btn" disabled={!free.length}>Admit patient</button></div></form></>
}

export function Outcomes() {
  const { db, user } = useApp(), s = stats(db, user!.role === 'doctor' ? user!.id : undefined)
  return <><h2 className="text-xl font-bold mb-1">Outcomes &amp; success rate</h2><p className="text-sm text-slate-500 mb-3">{user!.role === 'doctor' ? 'Your discharged patients' : 'All discharged patients'} (fictional data). Outcome is recorded by administration at discharge.</p>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Stat l="Total discharged" v={s.total} i="🏁" /><Stat l="Success rate (recovered)" v={`${s.success}%`} c="text-green-700" i="💚" bg="bg-green-50" /><Stat l="Mortality rate" v={`${s.mortality}%`} c="text-red-700" i="🕊️" bg="bg-red-50" /><Stat l="Avg. length of stay (days)" v={s.los} i="📅" /></div>
    <div className="card mt-4"><div className="flex justify-between text-sm mb-2"><b>Recovered {s.rec} · Deceased {s.dead}</b><span>{s.success}% success</span></div><div className="bar"><i style={{ width: `${s.success}%` }} /></div></div></>
}

export function Audit() {
  const { db, user } = useApp(), a = user!.role === 'admin' ? db.audit : db.audit.filter(x => x.u === user!.name)
  return <><h2 className="text-xl font-bold mb-3">Activity log</h2><div className="card"><Tbl head={['Time', 'User', 'Action']} empty="No activity yet." rows={a.slice(0, 100).map(x => [fmt(x.t), x.u, x.m])} /></div></>
}
