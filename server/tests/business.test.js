import test from 'node:test'; import assert from 'node:assert'; import {gradeFor,balance,attendancePct} from '../src/lib.js';
test('grade boundaries',()=>{ assert.equal(gradeFor(90),'A+'); assert.equal(gradeFor(79),'B'); assert.equal(gradeFor(49),'F'); });
test('fee balance with discount fine partial and reversed ignored',()=>{ const c={amount:2000,discount:200,fine:100}; const b=balance(c,[{amount:1000,isReversed:false},{amount:500,isReversed:true}]); assert.deepEqual(b,{paid:1000,due:1900,balance:900,status:'PARTIAL'}); });
test('attendance pct counts present+late',()=>{ assert.equal(attendancePct([{status:'PRESENT'},{status:'LATE'},{status:'ABSENT'},{status:'LEAVE'}]),50); });
