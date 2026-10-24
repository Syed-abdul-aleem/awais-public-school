export function gradeFor(pct){ if(pct>=90) return 'A+'; if(pct>=80) return 'A'; if(pct>=70) return 'B'; if(pct>=60) return 'C'; if(pct>=50) return 'D'; return 'F'; }
export function balance(charge, payments){ const paid = payments.filter(p=>!p.isReversed).reduce((s,p)=>s+p.amount,0); const due = charge.amount - (charge.discount||0) + (charge.fine||0); return {paid, due, balance: Math.max(0,due-paid), status: paid<=0?'UNPAID': paid>=due?'PAID':'PARTIAL'}; }
export function attendancePct(records){ if(!records.length) return 0; const ok = records.filter(r=>['PRESENT','LATE'].includes(r.status)).length; return Math.round(ok/records.length*1000)/10; }
export function receiptNo(id){ return 'APS-'+String(id).padStart(6,'0'); }
