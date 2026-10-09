import { ReactNode } from 'react'
import { Patient } from './types'
import { fmt } from './lib'
export const ini = (n: string) => n.replace(/^(Dr\.|Nurse)\s+/, '').split(' ').map(w => w[0]).slice(0, 2).join('')
export const Badge = ({ k = 'gr', children }: { k?: string; children: ReactNode }) => <span className={`b ${k}`}>{children}</span>
export function Stat({ l, v, c = 'text-blue-800', i, bg = 'bg-blue-50' }: { l: string; v: ReactNode; c?: string; i?: string; bg?: string }) {
  const icon = i ?? (/attention/i.test(l) ? '🚨' : /eligible/i.test(l) ? '🎯' : /pending/i.test(l) ? '⏳' : /done|completed/i.test(l) ? '✅' : /Occupied/.test(l) ? '🛏️' : /Available/.test(l) ? '🟢' : '👥')
  return <div className="card flex items-center gap-3"><div className={`ic ${bg}`}>{icon}</div><div><div className={`text-3xl font-bold leading-none ${c}`}>{v}</div><div className="text-sm text-slate-500 mt-1">{l}</div></div></div>
}
export function Tbl({ head, rows, empty = 'Nothing to show.' }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  return <div className="overflow-x-auto"><table className="w-full"><thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>) : <tr><td colSpan={head.length} className="text-slate-500 p-6 text-center">{empty}</td></tr>}</tbody></table></div>
}
export function Chart({ p }: { p: Patient }) {
  const r = [...p.temps].sort((a, b) => (a.t < b.t ? -1 : 1))
  if (r.length < 2) return <p className="text-slate-500 text-sm">At least two readings are needed for a trend chart.</p>
  const W = 560, H = 190, L = 34, mn = 36, mx = 40
  const y = (v: number) => H - 24 - (Math.min(Math.max(v, mn), mx) - mn) / (mx - mn) * (H - 40)
  const ts = r.map(x => new Date(x.t).getTime()), a = ts[0], b = ts[ts.length - 1]
  const x = (i: number) => L + (ts[i] - a) / (b - a || 1) * (W - L - 12)
  const pts = r.map((v, i) => `${x(i)},${y(v.c)}`).join(' ')
  return <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" role="img" aria-label="Temperature trend">
    {[36, 37, 38, 39, 40].map(v => <g key={v}><line x1={L} x2={W} y1={y(v)} y2={y(v)} stroke="#e2e8f0" /><text x="2" y={y(v) + 4} fontSize="11" fill="#64748b">{v}°</text></g>)}
    <line x1={L} x2={W} y1={y(38)} y2={y(38)} stroke="#dc2626" strokeDasharray="5 4" /><text x={W - 90} y={y(38) - 4} fontSize="11" fill="#dc2626">Fever ≥ 38.0°</text>
    <polygon fill="#dbeafe" opacity=".6" points={`${x(0)},${H - 24} ${pts} ${x(r.length - 1)},${H - 24}`} />
    <polyline fill="none" stroke="#1d4ed8" strokeWidth="2" points={pts} />
    {r.map((v, i) => <circle key={i} cx={x(i)} cy={y(v.c)} r="4" fill={v.c >= 38 ? '#dc2626' : '#1d4ed8'}><title>{fmt(v.t)}: {v.c}°C</title></circle>)}
    <text x={L} y={H - 6} fontSize="11" fill="#64748b">{r[0].t.slice(0, 10)}</text><text x={W - 70} y={H - 6} fontSize="11" fill="#64748b">{r[r.length - 1].t.slice(0, 10)}</text></svg></div>
}
