import { useApp } from './store'
import { NAV } from './lib'
import { ini } from './ui'
import { Admit, Audit, Beds, Dashboard, Detail, Discharges, Login, Outcomes, Patients, Tasks } from './pages'

const VIEWS = { dash: Dashboard, patients: Patients, tasks: Tasks, disc: Discharges, beds: Beds, admit: Admit, out: Outcomes, audit: Audit, detail: Detail }

export default function App() {
  const { user, view, go, logout, reset, tmsg, dlg, answer } = useApp()
  const overlay = <>
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50" role="status">{tmsg && <div className={`card !border-2 ${tmsg.k === 'er' ? '!border-red-400' : '!border-green-400'}`}>{tmsg.k === 'er' ? '⚠ ' : '✓ '}{tmsg.m}</div>}</div>
    {dlg && <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-40" role="dialog" aria-modal="true"><div className="card max-w-md w-full"><p className="mb-4">{dlg.m}</p><div className="flex gap-2 justify-end"><button className="btn g" onClick={() => answer(false)}>Cancel</button><button className="btn" autoFocus onClick={() => answer(true)}>{dlg.label}</button></div></div></div>}</>
  if (!user) return <><Login />{overlay}</>
  const nav = NAV[user.role]
  const View = nav.some(n => n[0] === view) || view === 'detail' ? VIEWS[view] : Dashboard
  return <><div className="md:flex min-h-screen">
    <aside className="side text-white md:w-64 md:sticky md:top-0 md:self-start md:h-screen p-3 md:p-4 flex md:flex-col gap-3 overflow-x-auto">
      <div className="flex items-center gap-2 md:mb-4 flex-none"><div className="ic bg-white/15">🏥</div><div><b className="text-lg leading-none">CareTrack</b><div className="text-xs text-blue-200 hidden md:block">Patient monitoring</div></div></div>
      <nav className="flex md:flex-col gap-1 md:flex-1">{nav.map(([v, l, i]) => <button key={v} onClick={() => go(v)} className={`nv flex-none whitespace-nowrap ${view === v || (view === 'detail' && v === 'patients') ? 'on' : ''}`}><span>{i}</span>{l}</button>)}</nav>
      <div className="hidden md:block border-t border-white/20 pt-3"><div className="flex items-center gap-2"><div className="av !w-9 !h-9 text-sm !bg-white/20">{ini(user.name)}</div><div className="text-sm"><b>{user.name}</b><div className="text-blue-200 text-xs">{user.role === 'admin' ? 'Administrative staff' : user.role}</div></div></div><button className="btn g w-full mt-3" onClick={logout}>Switch role</button></div></aside>
    <div className="flex-1 min-w-0"><div className="bg-white/80 backdrop-blur border-b px-4 md:px-8 py-3 flex justify-between items-center"><div className="text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div><div className="flex items-center gap-2"><span className="b wa">Demo data</span><button className="btn g md:hidden !py-1" onClick={logout}>Switch</button></div></div>
      <main className="p-4 md:p-8 max-w-6xl"><View /><p className="text-xs text-slate-500 mt-8">Fictional demonstration data · <button className="underline" onClick={reset}>Reset demo data</button></p></main></div></div>{overlay}</>
}
