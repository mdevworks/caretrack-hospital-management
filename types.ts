export type Role = 'nurse' | 'doctor' | 'admin'
export interface User { id: string; name: string; role: Role }
export interface Temp { t: string; c: number; note: string; by: string }
export interface Note { t: string; text: string; plan: string; by: string }
export interface Rec { status: 'pending' | 'confirmed'; t: string; by: string }
export type Outcome = 'recovered' | 'deceased'
export interface Patient {
  id: string; name: string; age: number; gender: string; admitted: string
  bed: string | null; lastBed?: string; nurse: string; doctor: string
  status: 'admitted' | 'discharged'; temps: Temp[]; notes: Note[]; visits: string[]
  rec: Rec | null; discharged: string | null; outcome?: Outcome
}
export interface Audit { t: string; u: string; m: string }
export interface DB { patients: Patient[]; audit: Audit[] }
export type View = 'dash' | 'patients' | 'tasks' | 'disc' | 'beds' | 'admit' | 'out' | 'audit' | 'detail'
