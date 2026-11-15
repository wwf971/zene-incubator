import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zeneActionRun, zeneEffectListApply } from './ZeneAction.js';
import {
	zeneAvailabilityNormalize, zeneAvailabilityReport, zeneAvailabilityResolve, zeneDayOf, zeneDeclarationCoverHours, zeneDeclarationText,
	zeneIsoWeekOf, zeneSpanDayRange, zeneSpanOfDay, zeneWeekdayOf,
} from './ZeneAvailability.js';
import { zeneIdNew } from './ZeneId.js';
import { zeneWorldBuild } from './ZeneWorld.js';

// The availability model of doc/zene-availability.md: declarations at any scale, merged by
// specificity. Run: npm test

const declare = (id, state, span, rest = {}) => ({ id, state, span, timeDeclared: '20261101_10000000+09', ...rest });
const stateAt = (availability, dayText, dayPart) => {
	const { dayList } = zeneAvailabilityResolve(zeneAvailabilityNormalize(availability), { dayFrom: zeneDayOf(dayText), dayCount: 1, dayPartList: [dayPart] });
	return dayList[0].partList[0];
};

test('spans: every scale reads as days, seasons and ISO weeks included', () => {
	const days = (span) => { const range = zeneSpanDayRange(span); return [range.dayTo - range.dayFrom + 1]; };
	assert.deepEqual(days({ unit: 'year', value: '2028' }), [366]);
	assert.deepEqual(days({ unit: 'season', value: '2026-winter' }), [90], 'Dec 2026 to Feb 2027');
	assert.equal(zeneSpanDayRange({ unit: 'season', value: '2026-winter' }).dayTo, zeneDayOf('2027-02-28'));
	assert.deepEqual(days({ unit: 'month', value: '2027-02' }), [28]);
	assert.equal(zeneSpanDayRange({ unit: 'week', value: '2027-W01' }).dayFrom, zeneDayOf('2027-01-04'));
	assert.deepEqual(zeneIsoWeekOf(zeneDayOf('2027-01-03')), { year: 2026, week: 53 });
	assert.equal(zeneSpanDayRange({ unit: 'range', from: '2027-01-05', to: '2027-01-01' }), null);
	assert.equal(zeneWeekdayOf(zeneDayOf('2026-11-15')), 'sun');
	assert.deepEqual(zeneSpanOfDay('season', zeneDayOf('2027-01-24')), { unit: 'season', value: '2026-winter' });
});

test('the most specific declaration decides; as specific, the later one', () => {
	const availability = {
		declarationList: [
			declare('weekend', 'available', { unit: 'always' }, { weekdayList: ['sat', 'sun'] }),
			declare('august', 'unavailable', { unit: 'month', value: '2027-08' }),
			declare('aug7', 'available', { unit: 'day', value: '2027-08-07' }, { dayPartList: ['evening'] }),
		],
	};
	assert.equal(stateAt(availability, '2027-07-31', 'afternoon').state, 'available', 'a Saturday of July: every weekend');
	assert.equal(stateAt(availability, '2027-08-14', 'afternoon').state, 'unavailable', 'a Saturday of August: the month is narrower than every weekend');
	assert.equal(stateAt(availability, '2027-08-07', 'evening').declarationId, 'aug7', 'one evening is narrower than the month');
	assert.equal(stateAt(availability, '2027-08-04', 'morning').state, 'unavailable');
	assert.equal(stateAt(availability, '2027-07-28', 'morning').state, '', 'a Wednesday nobody spoke of');
	const [weekend, august] = zeneAvailabilityNormalize(availability).declarationList;
	assert.ok(zeneDeclarationCoverHours(august) < zeneDeclarationCoverHours(weekend));
	// two declarations as specific: the later one
	const twice = { declarationList: [declare('a', 'available', { unit: 'month', value: '2027-03' }, { timeDeclared: '20261102_10000000+09' }), declare('b', 'limited', { unit: 'month', value: '2027-03' })] };
	assert.equal(stateAt(twice, '2027-03-10', 'evening').declarationId, 'a');
});

test('hours inside a part of a day decide it in part', () => {
	const availability = { declarationList: [declare('wed', 'available', { unit: 'always' }, { weekdayList: ['wed'], hourFrom: '19:30', hourTo: '22:00' })] };
	const evening = stateAt(availability, '2026-11-18', 'evening');
	assert.deepEqual([evening.state, evening.isPartial], ['available', true]);
	assert.equal(stateAt(availability, '2026-11-18', 'afternoon').state, '');
	assert.equal(zeneDeclarationText(zeneAvailabilityNormalize(availability).declarationList[0], '+09'), 'every Wed · 19:30–22:00 +09');
});

test('the report: the status said now, else what the next two weeks say; usual and next free times', () => {
	const time = '20261115_12000000+09';
	const base = { declarationList: [declare('weekend', 'available', { unit: 'always' }, { weekdayList: ['sat'], dayPartList: ['afternoon', 'evening'] })] };
	const report = zeneAvailabilityReport(zeneAvailabilityNormalize(base), { time, weekCount: 4 });
	assert.deepEqual(report.usualList, [{ weekday: 'sat', partList: ['afternoon', 'evening'] }]);
	assert.equal(report.nextFreeList[0].text, '2026-11-21');
	assert.equal(report.status.source, 'declared');
	const busy = zeneAvailabilityNormalize({ ...base, current: { state: 'unavailable', note: 'on tour', until: '2026-11-30', timeDeclared: '20261110_10000000+09' } });
	const reportBusy = zeneAvailabilityReport(busy, { time, weekCount: 4 });
	assert.deepEqual([reportBusy.status.state, reportBusy.status.source], ['unavailable', 'current']);
	assert.equal(reportBusy.nextFreeList[0].text, '2026-12-05', 'three weeks on tour are narrower than every Saturday: the first free one is after the tour');
	busy.declarationList.push(zeneAvailabilityNormalize({ declarationList: [declare('gig', 'available', { unit: 'day', value: '2026-11-21' }, { dayPartList: ['evening'] })] }).declarationList[0]);
	assert.equal(zeneAvailabilityReport(busy, { time, weekCount: 4 }).nextFreeList[0].text, '2026-11-21', 'one evening is narrower than the tour');
	const reportLater = zeneAvailabilityReport(busy, { time: '20261205_12000000+09', weekCount: 4 });
	assert.equal(reportLater.status.isCurrentOver, true);
});

test('the actions: only the person declares; the first declaration makes the item, later ones change it', () => {
	const entryByKey = new Map([
		['individual:pl', { kind: 'individual', data: { id: 'pl', name: 'Lena', account: 'al' } }],
		['account:al', { kind: 'account', data: { id: 'al', handle: 'lena', subject: { kind: 'individual', id: 'pl' } } }],
		['individual:pm', { kind: 'individual', data: { id: 'pm', name: 'Mika', account: 'am' } }],
		['account:am', { kind: 'account', data: { id: 'am', handle: 'mika', subject: { kind: 'individual', id: 'pm' } } }],
	]);
	let world = zeneWorldBuild([...entryByKey.values()]);
	const run = (actionId, actor, input) => {
		const answer = zeneActionRun(world, { actionId, actor, input, time: '20261115_12000000+09', idNew: () => zeneIdNew() });
		if (answer.code === 0) { zeneEffectListApply(entryByKey, answer.data.effectList); world = zeneWorldBuild([...entryByKey.values()]); }
		return answer;
	};
	const lena = { personId: 'pl', accountId: 'al' };
	const subject = { kind: 'individual', id: 'pl' };
	assert.equal(run('availability.declare', { personId: 'pm', accountId: 'am' }, { subject, declaration: { state: 'available', span: { unit: 'always' } } }).code, -8);
	assert.equal(run('availability.declare', lena, { subject, declaration: { state: 'available', span: { unit: 'month', value: '2027-13' } } }).message, 'say when: the span cannot be read');
	const first = run('availability.declare', lena, { subject, declaration: { state: 'available', span: { unit: 'always' }, weekdayList: ['sat', 'sun'] } });
	assert.deepEqual(first.data.effectList.map((one) => `${one.op} ${one.kind}`), ['create availability']);
	const second = run('availability.currentSet', lena, { subject, state: 'available', note: 'new in Tokyo, free every weekend' });
	assert.deepEqual(second.data.effectList.map((one) => `${one.op} ${one.kind}`), ['update availability']);
	const { declarationId } = first.data.result;
	run('availability.declare', lena, { subject, declaration: { id: declarationId, state: 'limited', span: { unit: 'always' }, weekdayList: ['sun'] } });
	const availability = world.availabilityOfSubject('individual', 'pl');
	assert.deepEqual(availability.declarationList.map((one) => [one.state, one.weekdayList.join()]), [['limited', 'sun']], 'the same id replaces it');
	assert.equal(availability.current.note, 'new in Tokyo, free every weekend');
	assert.equal(run('availability.remove', lena, { subject, declarationId }).code, 0);
	assert.equal(world.availabilityOfSubject('individual', 'pl').declarationList.length, 0);
});
