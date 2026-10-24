const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const token = () => localStorage.getItem('aps_token');
export async function api(path:string, opts:any={}){ const r=await fetch(BASE+path,{...opts,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token()}`,...(opts.headers||{})}}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }
export const money=(n:number)=>'Rs '+(n||0).toLocaleString('en-PK');
