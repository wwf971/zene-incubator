import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zeneActionReasonGet, zeneActionRun, zeneEffectListApply, ZENE_CODE_FORBIDDEN, ZENE_CODE_SIGN_IN } from './ZeneAction.js';
import { zeneIdNew } from './ZeneId.js';
import { zeneFeed, zeneInbox, zeneSearch } from './ZeneQuery.js';
import { zeneAccountExpiredIs, zeneAccountManageList, zeneEventVisibleIs } from './ZeneRole.js';
import { zeneTimeAdd, zeneTimeMs, DAY_MS } from './ZeneTime.js';
import { zeneWorldBuild } from './ZeneWorld.js';

// The semantic model of doc/zene-action.md, run on a small community: who may do what, and what
// each action changes. Run: npm test

const T0 = '20261115_10000000+09';

// a small community: Kenji owns Aurora, Mika is a member, Lena is new; tags in a DAG
function entryListBase() {
	const tag = (id, label, kindList, rest = {}) => ({ kind: 'tag', data: { id, label, kindList, ...rest } });
	return [
		tag('t0', 'Instrument', ['skill']),
		tag('t1', 'Strings', ['skill'], { parentList: ['t0'] }),
		tag('t2', 'Bowed strings', ['skill'], { parentList: ['t1'] }),
		tag('t3', 'Violin', ['skill'], { parentList: ['t2'] }),
		tag('t4', 'Viola', ['skill'], { parentList: ['t2'] }),
		tag('t5', 'Dvořák', ['composer']),
		tag('t6', 'Symphony No. 9', ['work'], { composerList: ['t5'] }),
		tag('t7', 'Concertmaster', ['role']),
		{ kind: 'individual', data: { id: 'pk', name: 'Kenji Mori', account: 'ak', skillList: [{ tag: 't3' }] } },
		{ kind: 'individual', data: { id: 'pm', name: 'Mika Tanaka', account: 'am', area: 'Setagaya', skillList: [{ tag: 't3', level: 5 }] } },
		{ kind: 'individual', data: { id: 'pl', name: 'Lena Park', account: 'al', skillList: [{ tag: 't4' }] } },
		{ kind: 'account', data: { id: 'ak', handle: 'kenji', name: 'Kenji Mori', subject: { kind: 'individual', id: 'pk' } } },
		{ kind: 'account', data: { id: 'am', handle: 'mika', name: 'Mika Tanaka', subject: { kind: 'individual', id: 'pm' } } },
		{ kind: 'account', data: { id: 'al', handle: 'lena', name: 'Lena Park', subject: { kind: 'individual', id: 'pl' } } },
		{ kind: 'group', data: { id: 'ga', name: 'Aurora', account: 'aa', joinPolicy: 'apply', tagList: ['t6'] } },
		{ kind: 'account', data: { id: 'aa', handle: 'aurora', name: 'Aurora', subject: { kind: 'group', id: 'ga' } } },
		{ kind: 'membership', data: { id: 'mk', group: 'ga', individual: 'pk', status: 'active', roleList: [{ role: 'owner', timeStart: '20200101_00000000+09' }] } },
		{ kind: 'membership', data: { id: 'mm', group: 'ga', individual: 'pm', status: 'active', roleList: [{ role: 't7', timeStart: '20220101_00000000+09' }] } },
	];
}

// a community that changes: each run applies its effects, as the local backend does
function communityCreate(entryList = entryListBase()) {
	const entryByKey = new Map(entryList.map((entry) => [`${entry.kind}:${entry.data.id}`, entry]));
	const state = { world: zeneWorldBuild([...entryByKey.values()]), time: T0 };
	state.run = (actionId, actor, input = {}) => {
		const answer = zeneActionRun(state.world, { actionId, actor, input, time: state.time, idNew: () => zeneIdNew() });
		if (answer.code === 0) {
			zeneEffectListApply(entryByKey, answer.data.effectList);
			state.world = zeneWorldBuild([...entryByKey.values()]);
		}
		return answer;
	};
	return state;
}

const KENJI = { personId: 'pk', accountId: 'ak' };
const MIKA = { personId: 'pm', accountId: 'am' };
const LENA = { personId: 'pl', accountId: 'al' };

test('a visitor registers: an individual and its account; a handle is taken once', () => {
	const community = communityCreate();
	const answer = community.run('account.register', {}, { name: 'Sora Ito', handle: 'sora.keys', skillList: ['t3'] });
	assert.equal(answer.code, 0, answer.message);
	assert.deepEqual(answer.data.effectList.map((one) => `${one.op} ${one.kind}`), ['create individual', 'create account']);
	const { personId, accountId } = answer.data.result;
	assert.equal(community.world.get('individual', personId).account, accountId);
	assert.equal(community.world.accountOfSubject('individual', personId).id, accountId);
	assert.equal(community.run('account.register', {}, { name: 'Other', handle: 'MIKA' }).message, 'the handle @mika is taken');
	assert.equal(community.run('account.register', MIKA, { name: 'x', handle: 'xyz' }).code, ZENE_CODE_FORBIDDEN);
});

test('applying to a group: the applicant asks, a manager decides, the membership is made', () => {
	const community = communityCreate();
	assert.equal(community.run('group.apply', {}, { group: 'ga' }).code, ZENE_CODE_SIGN_IN);
	const applied = community.run('group.apply', LENA, { group: 'ga', message: 'violist, new in Tokyo', skillList: ['t4'] });
	assert.equal(applied.code, 0, applied.message);
	const { applicationId } = applied.data.result;
	assert.equal(community.run('group.apply', LENA, { group: 'ga' }).message, 'your application is waiting already');
	assert.equal(zeneInbox(community.world, { personId: 'pk', time: T0 }).decideList.length, 1);
	assert.equal(zeneInbox(community.world, { personId: 'pm', time: T0 }).decideList.length, 0);
	// Mika is a member, not an admin: she does not decide
	assert.equal(community.run('application.accept', MIKA, { application: applicationId }).code, ZENE_CODE_FORBIDDEN);
	const accepted = community.run('application.accept', KENJI, { application: applicationId });
	assert.equal(accepted.code, 0, accepted.message);
	assert.deepEqual(accepted.data.effectList.map((one) => `${one.op} ${one.kind}`), ['update application', 'create membership']);
	assert.equal(community.world.get('application', applicationId).status, 'accepted');
	assert.equal(community.run('group.apply', LENA, { group: 'ga' }).message, 'you are a member already');
});

test('roles have periods; the last owner does not leave; admin is given by an owner only', () => {
	const community = communityCreate();
	assert.equal(community.run('group.leave', KENJI, { group: 'ga' }).message, 'you are its last owner: make another member an owner first');
	assert.equal(community.run('membership.roleSet', MIKA, { membership: 'mk', role: 'admin', isOn: true }).code, ZENE_CODE_FORBIDDEN);
	assert.equal(community.run('membership.roleSet', KENJI, { membership: 'mm', role: 'admin', isOn: true }).code, 0);
	assert.deepEqual(zeneAccountManageList(community.world, 'pm', T0).map((one) => one.handle), ['mika', 'aurora']);
	// an admin gives a role tag, not owner
	community.time = zeneTimeAdd(T0, DAY_MS);
	assert.equal(community.run('membership.roleSet', MIKA, { membership: 'mm', role: 'owner', isOn: true }).message, 'only an owner gives or ends owner and admin');
	assert.equal(community.run('membership.roleSet', KENJI, { membership: 'mm', role: 'owner', isOn: true }).code, 0);
	assert.equal(community.run('group.leave', KENJI, { group: 'ga' }).code, 0);
	const left = community.world.get('membership', 'mk');
	assert.equal(left.status, 'left');
	assert.ok(left.roleList.every((one) => one.timeEnd), 'the roles of who left are ended');
});

test('an event organized by a group: its account is temporary, a rehearsal is seen by its participants', () => {
	const community = communityCreate();
	const asAurora = { personId: 'pk', accountId: 'aa' };
	assert.equal(community.run('event.create', { personId: 'pl', accountId: 'aa' }, { name: 'x', timeStart: '20261213_14000000+09' }).message, 'you cannot act as this account');
	const made = community.run('event.create', asAurora, { name: 'Winter Concert', timeStart: '20261213_14000000+09', timeEnd: '20261213_16300000+09', handle: 'aurora.winter', openList: [{ tag: 't2', count: 2 }] });
	assert.equal(made.code, 0, made.message);
	const { eventId, accountId } = made.data.result;
	const event = community.world.get('event', eventId);
	assert.deepEqual(event.principalList[0], { kind: 'group', id: 'ga', role: 'organizer', status: 'confirmed', skillList: [] });
	const account = community.world.get('account', accountId);
	assert.equal(zeneTimeMs(account.timeExpire) - zeneTimeMs(event.timeEnd), 30 * DAY_MS);
	assert.ok(zeneAccountExpiredIs(account, '20270201_00000000+09'));
	// a draft is seen by its organizers only
	assert.equal(zeneEventVisibleIs(community.world, 'pl', event, T0), false);
	assert.equal(community.run('event.publish', MIKA, { event: eventId }).code, ZENE_CODE_FORBIDDEN);
	assert.equal(community.run('event.publish', KENJI, { event: eventId }).code, 0);
	const rehearsal = community.run('rehearsal.create', KENJI, { event: eventId, timeStart: '20261122_13000000+09', timeEnd: '20261122_17000000+09' });
	assert.equal(rehearsal.code, 0, rehearsal.message);
	const rehearsalEvent = community.world.get('event', rehearsal.data.result.eventId);
	assert.equal(zeneEventVisibleIs(community.world, 'pm', rehearsalEvent, T0), true, 'a member of the organizing group sees it');
	assert.equal(zeneEventVisibleIs(community.world, 'pl', rehearsalEvent, T0), false, 'an outsider does not');
	// hiring for the event: Lena applies through the post, Kenji accepts, the position is filled
	const post = community.run('post.create', asAurora, { postKind: 'hiring', text: 'two extra violas', hiring: { target: { kind: 'event', id: eventId }, tag: 't4', count: 2 } });
	assert.equal(post.code, 0, post.message);
	const applied = community.run('hiring.apply', LENA, { post: post.data.result.postId, message: 'happy to join' });
	assert.equal(applied.code, 0, applied.message);
	assert.deepEqual(community.world.get('application', applied.data.result.applicationId).target, { kind: 'event', id: eventId });
	assert.equal(community.run('application.accept', KENJI, { application: applied.data.result.applicationId }).code, 0);
	const eventAfter = community.world.get('event', eventId);
	assert.ok(eventAfter.principalList.some((one) => one.id === 'pl' && one.status === 'confirmed'));
	assert.deepEqual(eventAfter.openList.map((one) => one.count), [1], 'a viola is under bowed strings: one of two positions filled');
});

test('search: words in any order, tags matched at or below in the DAG, through composers too', () => {
	const world = communityCreate().world;
	const idOf = (list) => list.map((one) => one.id);
	assert.deepEqual(idOf(zeneSearch(world, { tagIdList: ['t2'], kind: 'individual' }, { time: T0 })).sort(), ['pk', 'pl', 'pm']);
	assert.deepEqual(idOf(zeneSearch(world, { tagIdList: ['t4'], kind: 'individual' }, { time: T0 })), ['pl']);
	assert.deepEqual(idOf(zeneSearch(world, { text: 'setagaya violin' }, { time: T0 })), ['pm']);
	assert.deepEqual(idOf(zeneSearch(world, { tagIdList: ['t5'] }, { time: T0 })), ['ga'], 'Aurora plays a work of Dvořák');
});

test('the tag DAG leaves out an edge closing a cycle, and says so', () => {
	const entryList = entryListBase();
	entryList.find((one) => one.data.id === 't0').data.parentList = ['t3'];
	const world = zeneWorldBuild(entryList);
	assert.ok(world.problemList.some((one) => one.includes('cycle')));
	// whichever edge was left out, no tag lies above and below another one
	for (const id of ['t0', 't1', 't2', 't3']) {
		const above = world.tag.ancestorSet(id);
		const below = world.tag.descendantSet(id);
		assert.deepEqual([...above].filter((one) => below.has(one)), [id]);
	}
});

test('follows make the feed; the effects of one action name each entity once', () => {
	const community = communityCreate();
	assert.equal(community.run('post.create', MIKA, { text: 'practising Dvořák' }).code, 0);
	assert.equal(community.run('post.create', { personId: 'pk', accountId: 'aa' }, { text: 'concert soon' }).code, 0);
	assert.equal(zeneFeed(community.world, { personId: 'pl', accountId: 'al', time: T0 }).isEveryone, true);
	assert.equal(community.run('account.follow', LENA, { account: 'am' }).code, 0);
	assert.equal(community.run('account.follow', LENA, { account: 'am' }).message, 'followed already');
	assert.equal(community.run('post.create', LENA, { text: 'hello' }).code, 0);
	const feed = zeneFeed(community.world, { personId: 'pl', accountId: 'al', time: T0 });
	assert.equal(feed.isEveryone, false);
	assert.deepEqual(feed.postList.map((one) => one.text).sort(), ['hello', 'practising Dvořák']);
	// a homepage written the first time: a page made, and the account pointing at it, in one plan
	const written = community.run('homepage.write', MIKA, { account: 'am', text: '# Mika\n\nViolinist.' });
	assert.deepEqual(written.data.effectList.map((one) => `${one.op} ${one.kind}`), ['create page', 'update account']);
	assert.equal(zeneActionReasonGet(community.world, { actionId: 'homepage.write', actor: LENA, input: { account: 'am' }, time: T0 }), 'you do not manage this account');
});
