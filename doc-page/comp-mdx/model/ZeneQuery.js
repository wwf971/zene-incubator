import { zeneEntityTagIdList } from './ZeneWorld.js';
import {
	zeneAccountExpiredIs, zeneAccountManageList, zeneApplicationDecideIs, zeneEventParticipantIs, zeneEventPrincipalListOf, zeneEventVisibleIs,
	zeneGroupManageIs, zeneMembershipActiveGet, zeneMembershipHolds, zeneMembershipRoleList,
} from './ZeneRole.js';
import { zeneTimeMs } from './ZeneTime.js';
import { zenePointParse } from './ZeneTimeline.js';

// when a period starts, for sorting: the earliest instant its start may be
const fromMsOf = (period) => zenePointParse(period?.from)?.msFrom ?? 0;

// What the screens read (doc/zene-ui.md#what-the-screens-read): every list a screen shows is a
// query over the world, for the person looking at it, at a moment. A query never changes data.

// --- searching -----------------------------------------------------------------------------------

export const ZENE_SEARCH_KIND_LIST = [
	{ id: 'individual', label: 'People' },
	{ id: 'group', label: 'Groups' },
	{ id: 'event', label: 'Events' },
	{ id: 'hiring', label: 'Hiring' },
];

const wordListOf = (text) => String(text ?? '').toLowerCase().split(/\s+/).filter(Boolean);

// The search of the Discover screen (doc/zene-ui.md#searching): words in any order, each found in
// some text of the result (its name, handle, area, description, or the label of one of its tags),
// and tags, each matched by the tag or any tag below it in the DAG. A result is { kind, id,
// entity, score, tagMatchedList }, best first.
//
//   query   { text, tagIdList, kind }   kind: one of ZENE_SEARCH_KIND_LIST, or '' for all
export function zeneSearch(world, { text = '', tagIdList = [], kind = '' }, { personId = '', time } = {}) {
	const wordList = wordListOf(text);
	const tagWantedList = tagIdList.filter((id) => world.tag.get(id));
	const resultList = [];
	const candidateList = [
		...(kind && kind !== 'individual' ? [] : world.list('individual').map((entity) => ({ kind: 'individual', entity }))),
		...(kind && kind !== 'group' ? [] : world.list('group').map((entity) => ({ kind: 'group', entity }))),
		...(kind && kind !== 'event' ? [] : world.list('event').filter((one) => zeneEventVisibleIs(world, personId, one, time)).map((entity) => ({ kind: 'event', entity }))),
		...(kind && kind !== 'hiring' ? [] : world.list('post').filter((one) => one.hiring?.isOpen).map((entity) => ({ kind: 'hiring', entity }))),
	];
	for (const candidate of candidateList) {
		const entityKind = candidate.kind === 'hiring' ? 'post' : candidate.kind;
		const tagList = zeneEntityTagIdList(world, entityKind, candidate.entity);
		const tagAncestorSet = new Set(tagList.flatMap((id) => [...world.tag.ancestorSet(id)]));
		// each wanted tag is matched by a tag of the result at it or below it
		const tagMatchedList = tagWantedList.filter((id) => tagAncestorSet.has(id));
		if (tagMatchedList.length < tagWantedList.length) continue;
		const fieldList = searchFieldListOf(world, candidate.kind, candidate.entity, tagAncestorSet);
		let score = 0;
		let isEveryWord = true;
		for (const word of wordList) {
			let best = 0;
			for (const field of fieldList) {
				const at = field.text.indexOf(word);
				if (at < 0) continue;
				best = Math.max(best, field.weight + (at === 0 ? 2 : 0));
			}
			if (best === 0) { isEveryWord = false; break; }
			score += best;
		}
		if (!isEveryWord) continue;
		score += tagMatchedList.length * 4;
		// what is coming soon reads before what is over; what hires reads first when nothing is typed
		if (candidate.kind === 'event' && zeneTimeMs(candidate.entity.timeStart) < zeneTimeMs(time)) score -= 1;
		resultList.push({ kind: candidate.kind, id: candidate.entity.id, entity: candidate.entity, score, tagMatchedList });
	}
	return resultList.sort((a, b) => b.score - a.score || labelOf(world, a).localeCompare(labelOf(world, b)));
}

function labelOf(world, result) {
	return result.kind === 'hiring' ? result.entity.text : result.entity.name ?? '';
}

function searchFieldListOf(world, kind, entity, tagAncestorSet) {
	const tagFieldList = [...tagAncestorSet].map((id) => ({ text: (world.tag.get(id)?.label ?? '').toLowerCase(), weight: 3 }));
	const account = kind === 'hiring' ? world.get('account', entity.account) : world.get('account', entity.account ?? '');
	const accountFieldList = account ? [{ text: account.handle, weight: 5 }, { text: account.bio.toLowerCase(), weight: 1 }] : [];
	if (kind === 'individual') return [{ text: entity.name.toLowerCase(), weight: 6 }, { text: entity.area.toLowerCase(), weight: 2 }, ...accountFieldList, ...tagFieldList];
	if (kind === 'group') return [{ text: entity.name.toLowerCase(), weight: 6 }, { text: entity.area.toLowerCase(), weight: 2 }, { text: entity.description.toLowerCase(), weight: 1 }, ...accountFieldList, ...tagFieldList];
	if (kind === 'event') return [{ text: entity.name.toLowerCase(), weight: 6 }, { text: `${entity.venue.name} ${entity.venue.area}`.toLowerCase(), weight: 2 }, { text: entity.description.toLowerCase(), weight: 1 }, { text: entity.eventKind, weight: 2 }, ...tagFieldList];
	return [{ text: entity.text.toLowerCase(), weight: 2 }, { text: (entity.hiring?.requirement ?? '').toLowerCase(), weight: 1 }, ...accountFieldList, ...tagFieldList];
}

// how many entities each tag finds (it or below it), for the tag browser
export function zeneTagUseCount(world, tagId) {
	const below = world.tag.descendantSet(tagId);
	let count = 0;
	for (const kind of ['individual', 'group', 'event']) {
		for (const entity of world.list(kind)) if (zeneEntityTagIdList(world, kind, entity).some((id) => below.has(id))) count += 1;
	}
	return count;
}

// --- the feed --------------------------------------------------------------------------------

// The Home screen (doc/zene-ui.md#home): the posts of what the person follows, of the groups they
// are in and of the events they take part in, and their own, newest first. Someone who follows
// nothing yet (and a visitor) sees every post of the community.
export function zeneFeed(world, { personId = '', accountId = '', time } = {}) {
	const postList = world.list('post');
	if (!personId) return { isEveryone: true, postList: postNewestFirst(postList) };
	const accountSet = new Set([accountId]);
	for (const account of zeneAccountManageList(world, personId, time)) accountSet.add(account.id);
	for (const follow of world.followByFrom.get(accountId) ?? []) accountSet.add(follow.to);
	for (const membership of world.membershipByIndividual.get(personId) ?? []) {
		if (!zeneMembershipHolds(membership, time)) continue;
		const account = world.accountOfSubject('group', membership.group);
		if (account) accountSet.add(account.id);
	}
	for (const event of world.list('event')) {
		if (!zeneEventParticipantIs(world, personId, event, time)) continue;
		const account = world.accountOfSubject('event', event.id);
		if (account) accountSet.add(account.id);
	}
	const mineList = postList.filter((post) => accountSet.has(post.account));
	if (mineList.length <= 1) return { isEveryone: true, postList: postNewestFirst(postList) };
	return { isEveryone: false, postList: postNewestFirst(mineList) };
}

function postNewestFirst(postList) {
	return [...postList].sort((a, b) => zeneTimeMs(b.timeCreated) - zeneTimeMs(a.timeCreated));
}

// --- the activity of a person -----------------------------------------------------------------

// The Activity screen (doc/zene-ui.md#activity): what waits for the person (applications to what
// they decide for, invitations to them or to a group they manage) and what they asked for.
export function zeneInbox(world, { personId = '', time } = {}) {
	if (!personId) return { decideList: [], inviteList: [], sentList: [], count: 0 };
	const decideList = world.list('application')
		.filter((one) => one.status === 'pending' && zeneApplicationDecideIs(world, personId, one, time))
		.sort((a, b) => zeneTimeMs(b.timeCreated) - zeneTimeMs(a.timeCreated));
	const inviteList = [];
	for (const event of world.list('event')) {
		for (const principal of zeneEventPrincipalListOf(world, personId, event, time)) {
			if (principal.status === 'invited') inviteList.push({ event, principal });
		}
	}
	const sentList = [...(world.applicationByApplicant.get(personId) ?? [])].sort((a, b) => zeneTimeMs(b.timeCreated) - zeneTimeMs(a.timeCreated));
	return { decideList, inviteList, sentList, count: decideList.length + inviteList.length };
}

// --- what a homepage shows ----------------------------------------------------------------------

// the memberships of a person: those holding now first, the latest started first; each with
// whether it holds now
export function zeneGroupListOfPerson(world, personId, time) {
	return [...(world.membershipByIndividual.get(personId) ?? [])]
		.map((membership) => ({ membership, group: world.get('group', membership.group), isActive: zeneMembershipHolds(membership, time) }))
		.filter((one) => one.group)
		.sort((a, b) => Number(b.isActive) - Number(a.isActive) || fromMsOf(b.membership.period) - fromMsOf(a.membership.period));
}

// the members of a group now, owners and admins first
export function zeneMemberListOfGroup(world, groupId, time) {
	const rank = (membership) => {
		const roleList = zeneMembershipRoleList(membership, time, { isMaybeHeld: true });
		return roleList.includes('owner') ? 0 : roleList.includes('admin') ? 1 : 2;
	};
	return [...(world.membershipByGroup.get(groupId) ?? [])]
		.filter((one) => zeneMembershipHolds(one, time))
		.map((membership) => ({ membership, individual: world.get('individual', membership.individual) }))
		.filter((one) => one.individual)
		.sort((a, b) => rank(a.membership) - rank(b.membership) || a.individual.name.localeCompare(b.individual.name));
}

// the events an account's subject takes part in, coming first then past, those the person may see
export function zeneEventListOfSubject(world, subject, { personId = '', time } = {}) {
	let eventList;
	if (subject.kind === 'event') eventList = (world.eventByParent.get(subject.id) ?? []);
	else {
		const key = `${subject.kind}:${subject.id}`;
		eventList = [...(world.eventByPrincipal.get(key) ?? [])];
		// a person also takes part through the groups they are in
		if (subject.kind === 'individual') {
			for (const membership of world.membershipByIndividual.get(subject.id) ?? []) {
				if (!zeneMembershipHolds(membership, time)) continue;
				for (const event of world.eventByPrincipal.get(`group:${membership.group}`) ?? []) if (!eventList.includes(event)) eventList.push(event);
			}
		}
	}
	return zeneEventSplit(world, eventList.filter((one) => one.status !== 'draft' || zeneGroupManageIs(world, personId, subject.id, time) || subject.id === personId)
		.filter((one) => zeneEventVisibleIs(world, personId, one, time)), time);
}

// events split into those coming (soonest first) and those over (latest first)
export function zeneEventSplit(world, eventList, time) {
	const now = zeneTimeMs(time);
	const endOf = (one) => zeneTimeMs(one.timeEnd || one.timeStart);
	return {
		comingList: eventList.filter((one) => endOf(one) > now).sort((a, b) => zeneTimeMs(a.timeStart) - zeneTimeMs(b.timeStart)),
		pastList: eventList.filter((one) => !(endOf(one) > now)).sort((a, b) => zeneTimeMs(b.timeStart) - zeneTimeMs(a.timeStart)),
	};
}

// the counts under a homepage's header
export function zeneAccountStat(world, account, time) {
	const { kind, id } = account.subject;
	const groupCount = kind === 'individual' ? (world.membershipByIndividual.get(id) ?? []).filter((one) => zeneMembershipHolds(one, time)).length : 0;
	const memberCount = kind === 'group' ? (world.membershipByGroup.get(id) ?? []).filter((one) => zeneMembershipHolds(one, time)).length : 0;
	const event = kind === 'event' ? world.get('event', id) : undefined;
	return {
		postCount: (world.postByAccount.get(account.id) ?? []).length,
		followerCount: (world.followByTo.get(account.id) ?? []).length,
		followingCount: (world.followByFrom.get(account.id) ?? []).length,
		groupCount,
		memberCount,
		principalCount: event ? event.principalList.filter((one) => one.status === 'confirmed').length : 0,
	};
}

// what a person is to an event: organizer, performer, invited ... '' for nothing
export function zeneEventStandingOf(world, personId, event, time) {
	const own = zeneEventPrincipalListOf(world, personId, event, time);
	if (own.some((one) => one.role === 'organizer' && one.status === 'confirmed')) return 'organizer';
	if (own.some((one) => one.status === 'invited')) return 'invited';
	if (zeneEventParticipantIs(world, personId, event, time)) return 'participant';
	return '';
}

// the state of an account, said under its name when it is not a usual one
export function zeneAccountStateText(account, time) {
	if (!account?.isTemporary) return '';
	return zeneAccountExpiredIs(account, time) ? 'event account, expired' : 'event account, temporary';
}

// the membership of the person in a group, for the buttons of its homepage
export function zeneMembershipOf(world, personId, groupId, time) {
	return zeneMembershipActiveGet(world, personId, groupId, time);
}

// --- timelines (doc/zene-timeline.md) -------------------------------------------------------------

const roleLabelOf = (world, role) => (role === 'owner' || role === 'admin' ? role : world.tag.get(role)?.label ?? role);

// the bars of one membership: the membership itself, then each period of each of its roles
function membershipBarList(world, membership) {
	return [
		{ id: membership.id, period: membership.period, label: 'member', tone: 'member', endReason: membership.endReason },
		...membership.roleList.map((one, index) => ({
			id: `${membership.id}:${index}`, period: one, label: roleLabelOf(world, one.role), tone: one.role === 'owner' || one.role === 'admin' ? 'manage' : 'role',
		})),
	];
}

// a person's groups on a timeline: a row per group, every membership in it and every role period
// (a person who left and came back has two memberships in one row)
export function zeneTimelineOfPerson(world, personId) {
	const rowByGroup = new Map();
	for (const membership of world.membershipByIndividual.get(personId) ?? []) {
		const group = world.get('group', membership.group);
		if (!group) continue;
		if (!rowByGroup.has(group.id)) rowByGroup.set(group.id, { id: group.id, kind: 'group', label: group.name, barList: [] });
		rowByGroup.get(group.id).barList.push(...membershipBarList(world, membership));
	}
	return [...rowByGroup.values()].sort((a, b) => Math.min(...a.barList.map((bar) => fromMsOf(bar.period))) - Math.min(...b.barList.map((bar) => fromMsOf(bar.period))));
}

// a group on a timeline: its own life, then a row per person who was ever a member
export function zeneTimelineOfGroup(world, groupId) {
	const group = world.get('group', groupId);
	const rowByPerson = new Map();
	for (const membership of world.membershipByGroup.get(groupId) ?? []) {
		const individual = world.get('individual', membership.individual);
		if (!individual) continue;
		if (!rowByPerson.has(individual.id)) rowByPerson.set(individual.id, { id: individual.id, kind: 'individual', label: individual.name, barList: [] });
		rowByPerson.get(individual.id).barList.push(...membershipBarList(world, membership));
	}
	const rowList = [...rowByPerson.values()].sort((a, b) => Math.min(...a.barList.map((bar) => fromMsOf(bar.period))) - Math.min(...b.barList.map((bar) => fromMsOf(bar.period))));
	return group?.period.from ? [{ id: group.id, kind: 'group', label: group.name, barList: [{ id: `${group.id}:life`, period: group.period, label: 'the group', tone: 'life' }] }, ...rowList] : rowList;
}
