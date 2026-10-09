import { DB, Patient, Role, User, View } from './types'
export const KEY = 'caretrack-v2'
const pad = (n: number) => String(n).padStart(2, '0')
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => ymd(new Date())
export const off = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d) }
export const nowT = () => { const d = new Date(); return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const fmt = (t: string) => (t.length > 10 ? `${t.slice(0, 10)} ${t.slice(11, 16)}` : t)
export const USERS: Record<string, User> = {
  n1: { id: 'n1', name: 'Nurse Priya Sharma', role: 'nurse' }, n2: { id: 'n2', name: 'Nurse Arun Das', role: 'nurse' },
  d1: { id: 'd1', name: 'Dr. Rao', role: 'doctor' }, d2: { id: 'd2', name: 'Dr. Mehta', role: 'doctor' },
  a1: { id: 'a1', name: 'Sam Admin', role: 'admin' },
}
export const BEDS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8']
export const NAV: Record<Role, [View, string, string][]> = {
  nurse: [['dash', 'Dashboard', '▦'], ['patients', 'My patients', '👥'], ['tasks', 'Daily tasks', '✅'], ['audit', 'Activity log', '🕑']],
  doctor: [['dash', 'Dashboard', '▦'], ['patients', 'My patients', '👥'], ['tasks', 'Daily tasks', '✅'], ['disc', 'Discharge review', '📋'], ['out', 'Outcomes', '📈'], ['audit', 'Activity log', '🕑']],
  admin: [['dash', 'Dashboard', '▦'], ['patients', 'All patients', '👥'], ['disc', 'Discharges', '📋'], ['beds', 'Beds', '🛏️'], ['admit', 'Admit patient', '➕'], ['out', 'Outcomes', '📈'], ['audit', 'Activity log', '🕑']],
}
export const nm = (id: string) => USERS[id]?.name ?? '—'
export const tToday = (p: Patient) => p.temps.filter(x => x.t.startsWith(today()))
export const tDone = (p: Patient) => tToday(p).length > 0
export const vDone = (p: Patient) => p.visits.includes(today())
export const attn = (p: Patient) => tToday(p).some(x => x.c >= 38)
export const occ = (db: DB) => Object.fromEntries(db.patients.filter(p => p.status === 'admitted' && p.bed).map(p => [p.bed as string, p])) as Record<string, Patient>
export function elig(p: Patient) {
  const days = [1, 2, 3].map(k => {
    const d = off(-k), r = p.temps.filter(x => x.t.startsWith(d))
    return { d, n: r.length, s: !r.length ? 'missing' : r.some(x => x.c >= 38) ? 'fever' : 'ok' }
  })
  const tf = tToday(p).some(x => x.c >= 38)
  return { days, tf, ok: days.every(x => x.s === 'ok') && !tf }
}
/** Outcome statistics over discharged patients (optionally limited to one doctor). */
export function stats(db: DB, doctor?: string) {
  const d = db.patients.filter(p => p.status === 'discharged' && (!doctor || p.doctor === doctor))
  const dead = d.filter(p => p.outcome === 'deceased').length, rec = d.filter(p => p.outcome !== 'deceased').length
  const days = d.map(p => Math.max(1, Math.round((+new Date(p.discharged as string) - +new Date(p.admitted)) / 864e5)))
  const pct = (n: number) => (d.length ? Math.round((n / d.length) * 1000) / 10 : 0)
  return { total: d.length, dead, rec, mortality: pct(dead), success: pct(rec), los: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : 0 }
}
const T = (d: number, h: string, c: number, note = '') => ({ t: `${off(d)}T${h}`, c, note, by: 'n1' })
const ok = (k: number, h: string) => T(-k, h, 36.6 + ((k * 7) % 5) / 10)
const P = (id: string, name: string, age: number, gender: string, ad: number, bed: string | null, nurse: string, doctor: string, temps: Patient['temps'], x: Partial<Patient> = {}): Patient =>
  ({ id, name, age, gender, admitted: off(ad), bed, nurse, doctor, status: 'admitted', temps, notes: [], visits: [], rec: null, discharged: null, ...x })
export function seed(): DB {
  return { audit: [{ t: nowT(), u: 'System', m: 'Fictional demo data loaded' }], patients: [
    P('P1001', 'Asha Verma', 54, 'Female', -6, 'B1', 'n1', 'd1', [ok(4, '08:10'), ok(3, '08:05'), ok(3, '20:00'), ok(2, '08:00'), ok(2, '19:40'), ok(1, '08:15'), ok(1, '20:10')]),
    P('P1002', 'Rohan Iyer', 41, 'Male', -4, 'B2', 'n1', 'd1', [T(-3, '08:00', 38.2), T(-2, '08:00', 38.4, 'Chills'), T(-1, '08:00', 37.6), T(0, '07:50', 37.2, 'Feeling better')], { visits: [today()], notes: [{ t: nowT(), text: 'Improving; fever resolved overnight.', plan: 'Continue antibiotics, monitor 3 days.', by: 'd1' }] }),
    P('P1003', 'Meera Nair', 67, 'Female', -2, 'B3', 'n2', 'd1', [T(-1, '09:00', 37.8), T(-1, '21:00', 37.5)]),
    P('P1004', 'Kabir Shah', 29, 'Male', -5, 'B4', 'n1', 'd2', [ok(4, '08:00'), ok(3, '08:00'), ok(1, '08:00'), T(0, '08:05', 37.0)]),
    P('P1005', 'Lila Fernandes', 72, 'Female', -3, 'B5', 'n2', 'd2', [T(-2, '08:00', 37.9), T(-1, '08:00', 38.1), T(0, '08:10', 38.6, 'Headache, shivering')]),
    P('P1006', 'Dev Malhotra', 36, 'Male', -7, 'B6', 'n2', 'd2', [ok(4, '08:00'), ok(3, '08:00'), ok(2, '08:00'), ok(1, '08:00'), T(0, '08:00', 36.8)], { visits: [today()], rec: { status: 'pending', t: nowT(), by: 'd2' }, notes: [{ t: nowT(), text: 'Afebrile 3 days, tolerating oral diet.', plan: 'Recommend discharge.', by: 'd2' }] }),
    P('P1007', 'Isha Kulkarni', 48, 'Female', -10, null, 'n1', 'd1', [ok(5, '08:00'), ok(4, '08:00'), ok(3, '08:00')], { status: 'discharged', discharged: off(-2), lastBed: 'B7', outcome: 'recovered', rec: { status: 'confirmed', t: `${off(-2)}T10:00`, by: 'd1' } }),
    P('P1008', 'Harish Bose', 81, 'Male', -12, null, 'n2', 'd2', [T(-7, '08:00', 39.1), T(-6, '08:00', 39.4, 'Deteriorating')], { status: 'discharged', discharged: off(-5), lastBed: 'B8', outcome: 'deceased' }),
  ] }
}
