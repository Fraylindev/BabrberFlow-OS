import assert from 'node:assert/strict';
import test from 'node:test';
import * as shared from '../../api/src/common/business-time.presentation.ts';
import * as existing from './business-time.ts';
test('M3 pure shared policy has parity in API and web without migrating screens',()=>{
  const now=new Date('2026-10-10T03:00:00Z');
  for(const zone of ['America/Santo_Domingo','America/New_York','Australia/Lord_Howe','Pacific/Apia'])
    for(const instant of ['2026-10-10T02:30:00Z','2026-11-01T05:30:00Z','2026-03-08T07:30:00Z','2027-01-01T00:00:00Z'])
      assert.deepEqual(shared.formatBusinessTime(instant,zone,{now}),existing.formatBusinessTime(instant,zone,{now}));
  for(const [date,zone,hours] of [['2026-03-08','America/New_York',23],['2026-11-01','America/New_York',25],['2026-04-05','Australia/Lord_Howe',24.5],['2026-10-04','Australia/Lord_Howe',23.5]] as const){
    assert.deepEqual(shared.businessDayRange(date,zone),existing.businessDayRange(date,zone));
    const range=shared.businessDayRange(date,zone)!;assert.equal((Date.parse(range.end)-Date.parse(range.start))/3600000,hours);
  }
  assert.equal(shared.businessDayRange('2011-12-30','Pacific/Apia'),null);
  assert.equal(shared.businessLocalToIso('2026-11-01T01:30','America/New_York'),null);
  assert.throws(()=>shared.formatBusinessTime('2026-10-10T00:00:00Z','invalid-zone'));
});
