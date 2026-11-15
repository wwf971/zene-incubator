import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zeneActionRun, zeneEffectListApply } from './ZeneAction.js';
import { zeneIdNew } from './ZeneId.js';
import { zeneMembershipRoleList } from './ZeneRole.js';
import { zeneTimelineOfPerson } from './ZeneQuery.js';
import {
	zeneLaneLayout, zenePeriodAt, zenePeriodCheck, zenePeriodOverlap, zenePeriodText, zenePointParse, zenePointText,
} from './ZeneTimeline.js';
import { zeneWorldBuild } from './ZeneWorld.js';

// The timeline of doc/zene-timeline.md: points as precise as they are known, periods holding yes,
// maybe or no. Run: npm test

test('a point keeps its precision: a month is some instant of the month, not its first day', () => {
	assert.equal(zenePointParse('2017').precision, 'year');
	const month = zenePointParse('2017-06');
	assert.equal(month.precision, 'month');
	assert.equal((month.msTo - month.msFrom) / 86400000, 30);
	assert.equal(zenePointParse('2017-02-30'), undefined);
	assert.equal(zenePointParse('20261115_12000000+09').precision, 'moment');
	assert.deepEqual([zenePointText('2017-06'), zenePointText('2017-06-04'), zenePointText('20261115_12000000+09')], ['Jun 2017', '2017-06-04 +09', '2026-11-15 +09']);
	assert.equal(zenePeriodText({ from: '2016-04', to: '2025-03' }), 'Apr 2016 – Mar 2025');
	assert.equal(zenePeriodText({ from: '2001', to: '' }, { isSince: true }), 'since 2001');
});

test('a period holds yes, maybe (inside the uncertainty of an end) or no', () => {
	const period = { from: '2016-04', to: '2025-03' };
	assert.equal(zenePeriodAt(period, '20160315_12000000+09'), 'no');
	assert.equal(zenePeriodAt(period, '20160415_12000000+09'), 'maybe', 'sometime in April: maybe not yet');
	assert.equal(zenePeriodAt(period, '20200101_12000000+09'), 'yes');
	assert.equal(zenePeriodAt(period, '20250320_12000000+09'), 'maybe', 'it ended sometime in March');
	assert.equal(zenePeriodAt(period, '20250401_12000000+09'), 'no');
	assert.equal(zenePeriodAt({ from: '2019-04', to: '' }, '20261115_12000000+09'), 'yes', 'an open end goes on');
	assert.equal(zenePeriodCheck({ from: '2019-04', to: '2019' }), '', 'a year ending a period that started in April of it is possible');
	assert.match(zenePeriodCheck({ from: '2019-04', to: '2018-12' }), /before it starts/);
	assert.match(zenePeriodCheck({ from: '2019-13', to: '' }), /is no time/);
});

test('overlap is yes, maybe or no; lanes keep apart what may overlap', () => {
	const now = '20261115_12000000+09';
	assert.equal(zenePeriodOverlap({ from: '2019-04', to: '' }, { from: '2017-09', to: '2019-06' }, now), 'yes');
	assert.equal(zenePeriodOverlap({ from: '2019-06', to: '' }, { from: '2017-09', to: '2019-06' }, now), 'maybe', 'both in June 2019');
	assert.equal(zenePeriodOverlap({ from: '2020', to: '' }, { from: '2017', to: '2019' }, now), 'no');
	const { barList, laneCount } = zeneLaneLayout([
		{ id: 'a', period: { from: '2017-09', to: '2019-06' } },
		{ id: 'b', period: { from: '2019-06', to: '' } },
		{ id: 'c', period: { from: '2020', to: '2021' } },
	], now);
	assert.equal(laneCount, 2);
	assert.deepEqual(barList.map((bar) => `${bar.id}${bar.lane}`), ['a0', 'b1', 'c0']);
});

test('roles of one membership may overlap, the same role too; history is told at any precision', () => {
	const entryByKey = new Map([
		['taxonomy:tx', { kind: 'taxonomy', data: { id: 'tx', tagList: [{ id: 'tl', label: 'Section leader', kindList: ['role'] }] } }],
		['group:g', { kind: 'group', data: { id: 'g', name: 'SGMO', period: { from: '2020-06' } } }],
		['individual:po', { kind: 'individual', data: { id: 'po', name: 'Sora' } }],
		['individual:pr', { kind: 'individual', data: { id: 'pr', name: 'Ren' } }],
		['membership:mo', { kind: 'membership', data: { id: 'mo', group: 'g', individual: 'po', period: { from: '2020-06' }, roleList: [{ role: 'owner', from: '2020-06' }] } }],
		['membership:mr', { kind: 'membership', data: { id: 'mr', group: 'g', individual: 'pr', period: { from: '2020-06' }, roleList: [{ role: 'tl', from: '2022-01', to: '2024-12' }, { role: 'tl', from: '2024-06' }] } }],
	]);
	let world = zeneWorldBuild([...entryByKey.values()]);
	const time = '20261115_12000000+09';
	assert.deepEqual(zeneMembershipRoleList(world.get('membership', 'mr'), '20240801_12000000+09'), ['tl'], 'two periods of one role at once: held once');
	const run = (actionId, actor, input) => {
		const answer = zeneActionRun(world, { actionId, actor, input, time, idNew: () => zeneIdNew() });
		if (answer.code === 0) { zeneEffectListApply(entryByKey, answer.data.effectList); world = zeneWorldBuild([...entryByKey.values()]); }
		return answer;
	};
	const owner = { personId: 'po', accountId: '' };
	assert.match(run('membership.historySet', owner, { membership: 'mr', roleList: [{ role: 'tl', from: '2019-01' }] }).message, /outside the membership/);
	assert.equal(run('membership.historySet', owner, { membership: 'mo', roleList: [] }).message, 'a group keeps one owner at least');
	const told = run('membership.historySet', owner, { membership: 'mr', period: { from: '2020-06', to: '2026-10' } });
	assert.equal(told.code, 0, told.message);
	assert.equal(world.get('membership', 'mr').endReason, 'left', 'an end told is how it ended');
	assert.equal(world.membershipByIndividual.get('pr').some((one) => zenePeriodAt(one.period, time) !== 'no'), false);
	const rowList = zeneTimelineOfPerson(world, 'pr');
	assert.deepEqual(rowList[0].barList.map((bar) => bar.label), ['member', 'Section leader', 'Section leader']);
});
