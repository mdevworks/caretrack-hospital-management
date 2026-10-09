# CareTrack – Patient Monitoring & Discharge Management (React + TypeScript + Vite)

Prototype for a campus assessment. **All patients are fictional.** No real patient data should ever be entered.

## Run locally
Requires Node.js 18+ (20 recommended).
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks (tsc) then builds to dist/
npm run preview    # serve the production build locally
```

## Demo login (no passwords – role switcher)
| Role | Users |
|---|---|
| Nurse | Nurse Priya Sharma, Nurse Arun Das |
| Doctor | Dr. Rao, Dr. Mehta |
| Administrative staff | Sam Admin |

Role checks are enforced in `src/store.tsx` for every action (record temperature, consult, recommend, discharge, admit).

## Suggested demo path
1. Dr. Rao → open **Asha Verma** (3 complete fever-free days) → Recommend discharge.
2. Sam Admin → **Discharges** → choose outcome → Confirm discharge → bed is released (**Beds**), see **Outcomes**.
3. Nurse Priya → **Daily tasks** → quick-record a temperature (a second same-day reading asks for confirmation).
4. Sam Admin → **Admit patient** (only free beds can be selected).

## Business rules
Fever = reading ≥ 38.0 °C. Eligibility needs each of the 3 most recent complete days (before today) to have ≥1 reading, all < 38.0 °C; missing days never count; a fever today blocks. It is a recommendation only; only admin can finalize a discharge, and a bed is released only then.
Outcomes page: success rate = recovered ÷ discharged, mortality rate = deceased ÷ discharged, plus average length of stay.

## Deploy to Vercel
**Dashboard:** push the folder to GitHub → vercel.com → *Add New → Project* → import the repo → Framework *Vite* (auto-detected; build `npm run build`, output `dist`) → Deploy.
**CLI:** `npm i -g vercel && vercel --prod`.
No environment variables or API keys are needed; none are used in the frontend.

## Structure
```
index.html  package.json  vite.config.ts  tsconfig.json  tailwind.config.js  postcss.config.js  vercel.json
src/main.tsx   entry          src/App.tsx   layout, nav, toast, confirm dialog
src/store.tsx  state, role-checked actions, localStorage persistence, audit log
src/lib.ts     dates, seed data, eligibility + outcome statistics
src/pages.tsx  all screens    src/ui.tsx    Stat, Tbl, Chart, Badge
src/types.ts   data models    src/index.css Tailwind + theme
```

## Known limitations
Data lives in the browser's localStorage (per browser/device, not shared, cleared if site data is cleared). Login is a demo role switcher, not real authentication. For production you would add a backend (e.g. Supabase) with real auth and server-side role enforcement.
