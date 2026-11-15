import { ZENE_EVENT_ACCOUNT_KEEP_DAY, ZENE_ROLE_MANAGE_LIST } from './ZeneKind.js';
import { DAY_MS, zenePeriodHas, zeneTimeMs } from './ZeneTime.js';

// Who a person is to the things of a community (doc/zene-action.md#who-may): every permission of
// an action is a question asked here, answered from the data alone, at a moment. Nothing is
// stored as a permission: an admin is a member whose membership holds the role admin now.
//
// The actor of an action is { personId, accountId }: the individual signed in, and the account
// they act as (their own, or the account of a group or an event they manage).

// the membership of a person in a group that is active now
export function zeneMembershipActiveGet(world, personId, groupId) {
	return (world.membershipByGroup.get(groupId) ?? []).find((one) => one.individual === personId && one.status === 'active');
}

// the roles a membership holds at a moment
export function zeneMembershipRoleList(membership, time) {
	if (!membership) return [];
	return membership.roleList.filter((one) => zenePeriodHas(one, time)).map((one) => one.role);
}

// 'owner' | 'admin' | 'member' | '': the highest standing of a person in a group now
export function zeneGroupStandingOf(world, personId, groupId, time) {
	const membership = zeneMembershipActiveGet(world, personId, groupId);
	if (!membership) return '';
	const roleList = zeneMembershipRoleList(membership, time);
	if (roleList.includes('owner')) return 'owner';
	if (roleList.includes('admin')) return 'admin';
	return 'member';
}

export function zeneGroupManageIs(world, personId, groupId, time) {
	return ['owner', 'admin'].includes(zeneGroupStandingOf(world, personId, groupId, time));
}

export function zeneRoleManageIs(role) {
	return ZENE_ROLE_MANAGE_LIST.includes(role);
}

// the owners of a group now
export function zeneGroupOwnerList(world, groupId, time) {
	return (world.membershipByGroup.get(groupId) ?? []).filter((one) => one.status === 'active' && zeneMembershipRoleList(one, time).includes('owner'));
}

// the principal of an event a person is, or speaks for: themselves, or a group they manage
export function zeneEventPrincipalListOf(world, personId, event, time) {
	return event.principalList.filter((principal) => (principal.kind === 'individual'
		? principal.id === personId
		: zeneGroupManageIs(world, personId, principal.id, time)));
}

// an organizer of an event: a confirmed principal with the role organizer, the person or a group
// they manage
export function zeneEventOrganizerIs(world, personId, eventId, time) {
	const event = world.get('event', eventId);
	if (!event) return false;
	return zeneEventPrincipalListOf(world, personId, event, time).some((one) => one.role === 'organizer' && one.status === 'confirmed');
}

// a rehearsal is organized by whoever organizes its parent
export function zeneEventManageIs(world, personId, eventId, time) {
	const event = world.get('event', eventId);
	if (!event) return false;
	if (zeneEventOrganizerIs(world, personId, eventId, time)) return true;
	return Boolean(event.parent) && zeneEventOrganizerIs(world, personId, event.parent, time);
}

// a participant of an event: a confirmed principal, or a member of a confirmed group principal
export function zeneEventParticipantIs(world, personId, event, time) {
	return event.principalList.some((principal) => principal.status === 'confirmed' && (principal.kind === 'individual'
		? principal.id === personId
		: Boolean(zeneMembershipActiveGet(world, personId, principal.id))));
}

// whether a person may see an event: a public event is seen by everyone once published; one
// of the members (a rehearsal) by its participants, and by those of its parent
export function zeneEventVisibleIs(world, personId, event, time) {
	if (zeneEventManageIs(world, personId, event.id, time)) return true;
	if (event.status === 'draft') return false;
	if (event.visibility === 'public') return true;
	if (!personId) return false;
	if (zeneEventParticipantIs(world, personId, event, time)) return true;
	const parent = event.parent ? world.get('event', event.parent) : undefined;
	return Boolean(parent) && zeneEventParticipantIs(world, personId, parent, time);
}

// an event account is temporary: it can be used until some days after its event ends
export function zeneAccountExpiredIs(account, time) {
	if (!account?.isTemporary) return false;
	const expire = zeneTimeMs(account.timeExpire);
	return Number.isFinite(expire) && zeneTimeMs(time) >= expire;
}

export function zeneEventAccountExpireOf(event) {
	const end = zeneTimeMs(event.timeEnd || event.timeStart);
	return Number.isFinite(end) ? end + ZENE_EVENT_ACCOUNT_KEEP_DAY * DAY_MS : Number.NaN;
}

// whether a person may act as an account: their own; a group's while they manage the group; an
// event's while they organize the event and the account has not expired
export function zeneAccountManageIs(world, personId, accountId, time) {
	const account = world.get('account', accountId);
	if (!account || !personId) return false;
	const { kind, id } = account.subject;
	if (kind === 'individual') return id === personId;
	if (kind === 'group') return zeneGroupManageIs(world, personId, id, time);
	if (kind === 'event') return !zeneAccountExpiredIs(account, time) && zeneEventOrganizerIs(world, personId, id, time);
	return false;
}

// the accounts a person may act as, their own first
export function zeneAccountManageList(world, personId, time) {
	if (!personId) return [];
	const own = world.accountOfSubject('individual', personId);
	const list = own ? [own] : [];
	for (const membership of world.membershipByIndividual.get(personId) ?? []) {
		if (membership.status !== 'active' || !zeneGroupManageIs(world, personId, membership.group, time)) continue;
		const account = world.accountOfSubject('group', membership.group);
		if (account && !list.includes(account)) list.push(account);
	}
	for (const event of world.list('event')) {
		const account = world.accountOfSubject('event', event.id);
		if (account && !list.includes(account) && zeneAccountManageIs(world, personId, account.id, time)) list.push(account);
	}
	return list;
}

// the subject an account speaks for, as an event principal: { kind: individual | group, id }
export function zeneAccountPrincipalOf(world, accountId) {
	const account = world.get('account', accountId);
	if (!account || !['individual', 'group'].includes(account.subject.kind)) return undefined;
	return { kind: account.subject.kind, id: account.subject.id };
}

// who manages what an application asks to join: a group's owners and admins, an event's organizers
export function zeneApplicationDecideIs(world, personId, application, time) {
	const { kind, id } = application.target;
	if (kind === 'group') return zeneGroupManageIs(world, personId, id, time);
	if (kind === 'event') return zeneEventManageIs(world, personId, id, time);
	if (kind === 'subgroup') {
		const subgroup = world.get('subgroup', id);
		return Boolean(subgroup) && (zeneGroupManageIs(world, personId, subgroup.group, time)
			|| subgroup.memberList.some((one) => one.individual === personId && one.role === 'lead'));
	}
	return false;
}
