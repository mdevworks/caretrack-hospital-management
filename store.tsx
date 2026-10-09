import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { DB, Outcome, User, View } from './types'
import { KEY, USERS, elig, nowT, occ, seed, today } from './lib'

export interface AdmitForm { pid: string; name: string; age: number; gender: string; date: string; bed: string; nurse: string; doctor: string }
interface Ctx {
  db: DB; user: User | null; view: View; pid: string | null
  go: (v: View, pid?: string) => void; login: (id: string) => void; logout: () => void; reset: () => Promise<void>
  toast: (m: string, k?: 'ok' | 'er') => void; ask: (m: ReactNode, label?: string) => Promise<boolean>
  addTemp: (pid: string, c: number, note: string) => boolean
  addVisit: (pid: string, text: string, plan: string, done: boolean) => boolean
  recommend: (pid: string) => boolean; discharge: (pid: string, o: Outcome) => boolean; admit: (f: AdmitForm) => boolean
  tmsg: { m: string; k: 'ok' | 'er' } | null; dlg: { m: ReactNode; label: string } | null; answer: (v: boolean) => void
}
const C = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(C)

function load(): DB {
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.patients) return d as DB } catch { /* ignore */ }
  return seed()
}
export function Provider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(load)
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<View>('dash')
  const [pid, setPid] = useState<string | null>(null)
  const [tmsg, setT] = useState<Ctx['tmsg']>(null)
  const [dlg, setDlg] = useState<Ctx['dlg']>(null)
  const res = useRef<(v: boolean) => void>(() => {})
  const timer = useRef<number>()
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* storage full/blocked */ } }, [db])

  const toast = (m: string, k: 'ok' | 'er' = 'ok') => { setT({ m, k }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setT(null), 4000) }
  const ask = (m: ReactNode, label = 'Confirm') => new Promise<boolean>(r => { res.current = r; setDlg({ m, label }) })
  const answer = (v: boolean) => { setDlg(null); res.current(v) }
  const run = (err: string | null, msg: string, fn: (d: DB) => void) => {
    if (err || !user) { toast(err ?? 'Not signed in.', 'er'); return false }
    setDb(prev => { const d = structuredClone(prev); fn(d); d.audit.unshift({ t: nowT(), u: user.name, m: msg }); return d })
    toast(msg); return true
  }
  const find = (id: string) => db.patients.find(p => p.id === id)
  const own = (id: string) => { const p = find(id); return p && user && p.status === 'admitted' && (user.role === 'nurse' ? p.nurse : p.doctor) === user.id ? p : undefined }
  const get = (d: DB, id: string) => d.patients.find(p => p.id === id)!

  const value: Ctx = {
    db, user, view, pid, tmsg, dlg, answer, toast, ask,
    go: (v, id) => { setView(v); if (id) setPid(id) },
    login: id => { setUser(USERS[id]); setView('dash') },
    logout: () => setUser(null),
    reset: async () => { if (await ask('Reset all data to the original fictional demo set?', 'Reset')) { setDb(seed()); toast('Demo data reset.') } },
    addTemp: (id, c, note) => {
      const p = own(id)
      const err = user?.role !== 'nurse' || !p ? 'Only the assigned nurse can record temperatures.' : !(c >= 30 && c <= 45) ? 'Temperature must be 30.0–45.0 °C.' : null
      return run(err, `Recorded ${c.toFixed(1)}°C for ${p?.name}`, d => get(d, id).temps.push({ t: nowT(), c: Math.round(c * 10) / 10, note: note.trim(), by: user!.id }))
    },
    addVisit: (id, text, plan, done) => {
      const p = own(id)
      const err = user?.role !== 'doctor' || !p ? 'Only the assigned doctor can add consultations.' : !text.trim() || !plan.trim() ? 'Notes and treatment decision are required.' : null
      return run(err, `Consultation saved for ${p?.name}${done ? ' — visit completed' : ''}`, d => { const q = get(d, id); q.notes.unshift({ t: nowT(), text: text.trim(), plan: plan.trim(), by: user!.id }); if (done && !q.visits.includes(today())) q.visits.push(today()) })
    },
    recommend: id => {
      const p = own(id)
      const err = user?.role !== 'doctor' || !p ? 'Only the assigned doctor can recommend discharge.' : !elig(p).ok ? 'Eligibility criteria are not met.' : p.rec ? 'A recommendation already exists.' : null
      return run(err, `Recommended discharge for ${p?.name} (${id})`, d => { get(d, id).rec = { status: 'pending', t: nowT(), by: user!.id } })
    },
    discharge: (id, o) => {
      const p = find(id)
      const err = user?.role !== 'admin' ? 'Only administrative staff can finalize a discharge.' : !p || p.rec?.status !== 'pending' ? 'No pending recommendation for this patient.' : null
      return run(err, `Discharged ${p?.name} (${o}); released bed ${p?.bed}`, d => { const q = get(d, id); q.lastBed = q.bed ?? undefined; q.bed = null; q.status = 'discharged'; q.discharged = today(); q.outcome = o; if (q.rec) q.rec.status = 'confirmed' })
    },
    admit: f => {
      const err = user?.role !== 'admin' ? 'Only administrative staff can admit patients.' : !f.name.trim() || !(f.age >= 0 && f.age <= 120) || !f.bed ? 'Complete all fields with valid values.'
        : db.patients.some(p => p.id === f.pid) ? 'Patient ID already exists.' : occ(db)[f.bed] ? `Bed ${f.bed} is occupied.` : f.date > today() ? 'Admission date cannot be in the future.' : null
      return run(err, `Admitted ${f.name.trim()} (${f.pid}) to bed ${f.bed}`, d => { d.patients.push({ id: f.pid, name: f.name.trim(), age: f.age, gender: f.gender, admitted: f.date, bed: f.bed, nurse: f.nurse, doctor: f.doctor, status: 'admitted', temps: [], notes: [], visits: [], rec: null, discharged: null }) })
    },
  }
  return <C.Provider value={value}>{children}</C.Provider>
}
