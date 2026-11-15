import { ZENE_EVENT_KIND_LIST, ZENE_JOIN_POLICY_LIST, ZENE_POST_KIND_LIST, ZENE_TAG_KIND_LIST, zeneEntityNormalize } from './ZeneKind.js';
import {
	zeneAccountExpiredIs, zeneAccountManageIs, zeneApplicationDecideIs, zeneEventAccountExpireOf, zeneEventManageIs, zeneEventOrganizerIs,
	zeneEventParticipantIs, zeneEventPrincipalListOf, zeneGroupManageIs, zeneGroupOwnerList, zeneGroupStandingOf, zeneMembershipActiveGet, zeneMembershipHolds,
	zeneSubgroupMemberList,
	zeneMembershipRoleList, zeneRoleManageIs,
} from './ZeneRole.js';
import { zeneTimeMs, zeneTimeText, zeneTimeZoneOf } from './ZeneTime.js';
import { ZENE_AVAILABILITY_STATE_LIST, zeneDayOf, zeneDeclarationCheck } from './ZeneAvailability.js';
import { zenePeriodCheck, zenePeriodHolds, zenePeriodWithin, zenePointCheck } from './ZeneTimeline.js';

// The actions of a community (doc/zene-action.md): everything a person can do that changes
// data. An action is the unit the user interface asks for and, later, what a backend answers:
//
//   run(world, { actionId, actor, input, time, idNew })
//     -> who      may this actor do it? (a question about the actor: ZeneRole)   refused: -7 / -8
//     -> check    is what is asked possible now? (the input and the state)       refused: -1
//     -> plan     the effects: data items created, updated, deleted              { effectList, result }
//
// An action never writes: it answers its effects, and whoever runs it applies them to its
// storage (the session of the page, a partition, a backend). So the same catalog runs in a
// demonstration and behind an api, and what a button does is written once.
//
//   actor   { personId, accountId }: the individual signed in, the account they act as
//   effect  { op: create | update | delete, kind, id, data?, fieldList? }   data: the entity after it

export const ZENE_CODE_SIGN_IN = -7;
export const ZENE_CODE_FORBIDDEN = -8;

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/;

// --- the parts every action is made of ---------------------------------------------------------

const signedIn = (ctx) => (ctx.actor.personId && ctx.person ? '' : 'sign in first');
const asSelf = (ctx) => signedIn(ctx) || (ctx.account?.subject.kind === 'individual' && ctx.account.subject.id === ctx.actor.personId ? '' : 'act as your own account for this');
const asManaged = (ctx) => signedIn(ctx) || (zeneAccountManageIs(ctx.world, ctx.actor.personId, ctx.actor.accountId, ctx.time) ? '' : 'you cannot act as this account');
const handleFree = (ctx, handle, accountIdOwn = '') => {
	const text = String(handle ?? '').replace(/^@/, '').toLowerCase();
	if (!HANDLE_PATTERN.test(text)) return 'a handle is 3 to 30 of a-z, 0-9, "." and "_", starting and ending with a letter or digit';
	const holder = ctx.world.accountByHandle(text);
	return holder && holder.id !== accountIdOwn ? `the handle @${text} is taken` : '';
};
const named = (value, what = 'a name') => (String(value ?? '').trim() ? '' : `give ${what}`);
const found = (ctx, kind, id, what = kind) => (ctx.world.get(kind, id) ? '' : `there is no such ${what}`);
const first = (...reasonList) => reasonList.find(Boolean) ?? '';
const handleClean = (handle) => String(handle ?? '').replace(/^@/, '').toLowerCase();
const timeAfter = (start, end) => (!Number.isFinite(zeneTimeMs(start)) ? 'give the time it starts'
	: end && !(zeneTimeMs(end) > zeneTimeMs(start)) ? 'it must end after it starts' : '');
const pendingOf = (ctx, personId, target) => (ctx.world.applicationByApplicant.get(personId) ?? [])
	.find((one) => one.status === 'pending' && one.target.kind === target.kind && one.target.id === target.id);
const eventEndedIs = (ctx, event) => zeneTimeMs(event.timeEnd || event.timeStart) <= zeneTimeMs(ctx.time);
// what the app records happens at a moment: a period it starts or ends is written to the moment
// (model/ZeneTimeline.js); only history told by people is written as a year, a month or a day
const roleListEnded = (roleList, time) => roleList.map((one) => (one.to ? one : { ...one, to: time }));
const pick = (input, keyList) => Object.fromEntries(keyList.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]));

// the actions, in the order they are listed (doc/zene-action.md#the-catalog)
export const ZENE_ACTION_LIST = [
	// --- accounts -------------------------------------------------------------------------------
	{
		id: 'account.register', group: 'account', label: 'Register',
		whoText: 'a visitor: nobody signed in',
		inputText: 'name, handle, area, skills',
		effectText: ['create individual', 'create account (of the individual)'],
		who: (ctx) => (ctx.actor.personId ? 'you are signed in already' : ''),
		check: (ctx) => first(named(ctx.input.name), handleFree(ctx, ctx.input.handle)),
		plan: (ctx, fx) => {
			const personId = ctx.idNew();
			const accountId = ctx.idNew();
			fx.create('individual', {
				id: personId, name: ctx.input.name.trim(), account: accountId, area: ctx.input.area ?? '',
				roleList: [{ role: 'practitioner', from: ctx.time }],
				skillList: (ctx.input.skillList ?? []).map((tag, index) => ({ tag, level: 3, isPrimary: index === 0 })),
			}, { createdBy: accountId });
			fx.create('account', {
				id: accountId, handle: handleClean(ctx.input.handle), name: ctx.input.name.trim(), subject: { kind: 'individual', id: personId },
				bio: ctx.input.bio ?? '', avatar: { seed: accountId }, viewList: ['about', 'post', 'event', 'group'],
			}, { createdBy: accountId });
			return { personId, accountId };
		},
	},
	{
		id: 'account.update', group: 'account', label: 'Edit an account',
		whoText: 'whoever may act as the account: the person, the managers of the group, the organizers of the event',
		inputText: 'account; name, handle, bio, the views of the homepage',
		effectText: ['update account'],
		who: (ctx) => signedIn(ctx) || (zeneAccountManageIs(ctx.world, ctx.actor.personId, ctx.input.account, ctx.time) ? '' : 'you do not manage this account'),
		check: (ctx) => first(found(ctx, 'account', ctx.input.account), ctx.input.handle !== undefined ? handleFree(ctx, ctx.input.handle, ctx.input.account) : ''),
		plan: (ctx, fx) => {
			const patch = pick(ctx.input, ['name', 'bio', 'viewList', 'avatar']);
			if (ctx.input.handle !== undefined) patch.handle = handleClean(ctx.input.handle);
			fx.update('account', ctx.input.account, patch);
		},
	},
	{
		id: 'individual.update', group: 'account', label: 'Edit a profile',
		whoText: 'the individual themselves',
		inputText: 'area, roles (each for a period), skills (each since a point), works, what they look for, pricing',
		effectText: ['update individual'],
		who: (ctx) => signedIn(ctx) || (ctx.input.individual === ctx.actor.personId ? '' : 'only the person edits their profile'),
		// the periods of the timeline as told: a year, a month, a day or a moment (model/ZeneTimeline.js)
		check: (ctx) => first(found(ctx, 'individual', ctx.input.individual, 'person'),
			...(ctx.input.roleList ?? []).map((one) => periodReason(`the ${one.role}`, one)),
			...(ctx.input.skillList ?? []).map((one) => (one.from ? pointReason('a skill', one.from) : ''))),
		plan: (ctx, fx) => fx.update('individual', ctx.input.individual, pick(ctx.input, ['name', 'area', 'roleList', 'skillList', 'workTagList', 'lookingForList', 'pricing'])),
	},
	{
		id: 'homepage.write', group: 'account', label: 'Write a homepage',
		whoText: 'whoever may act as the account',
		inputText: 'account, text (Markdown)',
		effectText: ['create page, update account (the first time)', 'update page (after)'],
		who: (ctx) => signedIn(ctx) || (zeneAccountManageIs(ctx.world, ctx.actor.personId, ctx.input.account, ctx.time) ? '' : 'you do not manage this account'),
		check: (ctx) => found(ctx, 'account', ctx.input.account),
		plan: (ctx, fx) => {
			const account = ctx.world.get('account', ctx.input.account);
			if (account.homepage && ctx.world.get('page', account.homepage)) {
				fx.update('page', account.homepage, { text: String(ctx.input.text ?? '') });
				return { pageId: account.homepage };
			}
			const pageId = fx.create('page', { account: account.id, text: String(ctx.input.text ?? '') });
			fx.update('account', account.id, { homepage: pageId });
			return { pageId };
		},
	},
	{
		id: 'account.follow', group: 'account', label: 'Follow',
		whoText: 'anyone signed in, as an account they may act as',
		inputText: 'the account followed',
		effectText: ['create follow'],
		who: asManaged,
		check: (ctx) => first(found(ctx, 'account', ctx.input.account),
			ctx.input.account === ctx.actor.accountId ? 'an account does not follow itself' : '',
			followOf(ctx) ? 'followed already' : ''),
		plan: (ctx, fx) => ({ followId: fx.create('follow', { from: ctx.actor.accountId, to: ctx.input.account }) }),
	},
	{
		id: 'account.unfollow', group: 'account', label: 'Unfollow',
		whoText: 'whoever may act as the following account',
		inputText: 'the account followed',
		effectText: ['delete follow'],
		who: asManaged,
		check: (ctx) => (followOf(ctx) ? '' : 'not followed'),
		plan: (ctx, fx) => fx.delete('follow', followOf(ctx).id),
	},
	// --- groups ---------------------------------------------------------------------------------
	{
		id: 'group.create', group: 'group', label: 'Create a group',
		whoText: 'anyone signed in, as themselves',
		inputText: 'name, handle, area, description, tags, how members join',
		effectText: ['create group', 'create account (of the group)', 'create membership (owner)'],
		who: asSelf,
		check: (ctx) => first(named(ctx.input.name), handleFree(ctx, ctx.input.handle), joinPolicyCheck(ctx.input.joinPolicy)),
		plan: (ctx, fx) => {
			const groupId = ctx.idNew();
			const accountId = ctx.idNew();
			fx.create('group', {
				id: groupId, name: ctx.input.name.trim(), account: accountId, area: ctx.input.area ?? '', description: ctx.input.description ?? '',
				tagList: ctx.input.tagList ?? [], joinPolicy: ctx.input.joinPolicy ?? 'apply', recruitList: ctx.input.recruitList ?? [], period: { from: ctx.time },
			});
			fx.create('account', { id: accountId, handle: handleClean(ctx.input.handle), name: ctx.input.name.trim(), subject: { kind: 'group', id: groupId }, bio: ctx.input.description ?? '', avatar: { seed: accountId }, viewList: ['about', 'post', 'event', 'group'] });
			fx.create('membership', { group: groupId, individual: ctx.actor.personId, period: { from: ctx.time }, roleList: [{ role: 'owner', from: ctx.time }] });
			return { groupId, accountId };
		},
	},
	{
		id: 'group.update', group: 'group', label: 'Edit a group',
		whoText: 'an owner or admin of the group',
		inputText: 'group; name, area, description, tags, how members join, who it looks for, its life (founded, dissolved)',
		effectText: ['update group'],
		who: (ctx) => signedIn(ctx) || (zeneGroupManageIs(ctx.world, ctx.actor.personId, ctx.input.group, ctx.time) ? '' : 'only its owners and admins edit a group'),
		check: (ctx) => first(found(ctx, 'group', ctx.input.group), ctx.input.joinPolicy !== undefined ? joinPolicyCheck(ctx.input.joinPolicy) : '',
			ctx.input.period ? periodReason('the life of the group', ctx.input.period) : ''),
		plan: (ctx, fx) => fx.update('group', ctx.input.group, pick(ctx.input, ['name', 'area', 'description', 'tagList', 'joinPolicy', 'recruitList', 'period'])),
	},
	{
		id: 'group.join', group: 'group', label: 'Join',
		whoText: 'anyone signed in who is not a member; the group lets anyone join',
		inputText: 'group, what they play in it',
		effectText: ['create membership'],
		who: signedIn,
		check: (ctx) => first(found(ctx, 'group', ctx.input.group), memberNot(ctx),
			ctx.world.get('group', ctx.input.group).joinPolicy === 'open' ? '' : 'this group does not take members without asking: apply'),
		plan: (ctx, fx) => ({ membershipId: fx.create('membership', { group: ctx.input.group, individual: ctx.actor.personId, period: { from: ctx.time }, roleList: [], skillList: ctx.input.skillList ?? [] }) }),
	},
	{
		id: 'group.apply', group: 'group', label: 'Apply to join',
		whoText: 'anyone signed in who is not a member, with no application waiting',
		inputText: 'group, a message, what they play, the post it answers',
		effectText: ['create application (pending)'],
		who: signedIn,
		check: (ctx) => {
			const reason = first(found(ctx, 'group', ctx.input.group), memberNot(ctx));
			if (reason) return reason;
			const group = ctx.world.get('group', ctx.input.group);
			if (group.joinPolicy === 'invite') return 'this group takes members by invitation only';
			return pendingOf(ctx, ctx.actor.personId, { kind: 'group', id: group.id }) ? 'your application is waiting already' : '';
		},
		plan: (ctx, fx) => ({ applicationId: applicationCreate(ctx, fx, { kind: 'group', id: ctx.input.group }) }),
	},
	{
		id: 'group.leave', group: 'group', label: 'Leave',
		whoText: 'a member; the last owner hands the group over first',
		inputText: 'group',
		effectText: ['update membership (left, its roles ended)'],
		who: (ctx) => signedIn(ctx) || (zeneMembershipActiveGet(ctx.world, ctx.actor.personId, ctx.input.group, ctx.time) ? '' : 'you are not a member'),
		check: (ctx) => (lastOwnerIs(ctx, ctx.actor.personId, ctx.input.group) ? 'you are its last owner: make another member an owner first' : ''),
		plan: (ctx, fx) => {
			const membership = zeneMembershipActiveGet(ctx.world, ctx.actor.personId, ctx.input.group, ctx.time);
			fx.update('membership', membership.id, { period: { ...membership.period, to: ctx.time }, endReason: 'left', roleList: roleListEnded(membership.roleList, ctx.time) });
		},
	},
	{
		id: 'membership.roleSet', group: 'group', label: 'Give or end a role',
		whoText: 'an owner or admin of the group; owner and admin are given and ended by an owner',
		inputText: 'membership, role (owner, admin, or a role tag), on or off',
		effectText: ['update membership (a period of the role started or ended)'],
		who: (ctx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			if (!membership) return signedIn(ctx);
			const standing = zeneGroupStandingOf(ctx.world, ctx.actor.personId, membership.group, ctx.time);
			if (!['owner', 'admin'].includes(standing)) return signedIn(ctx) || 'only its owners and admins give roles';
			return zeneRoleManageIs(ctx.input.role) && standing !== 'owner' ? 'only an owner gives or ends owner and admin' : '';
		},
		check: (ctx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			if (!membership || !zeneMembershipHolds(membership, ctx.time)) return 'there is no such membership';
			if (!zeneRoleManageIs(ctx.input.role) && !ctx.world.get('tag', ctx.input.role)?.kindList.includes('role')) return 'a role is owner, admin, or a tag of the kind role';
			const hasRole = zeneMembershipRoleList(membership, ctx.time).includes(ctx.input.role);
			if (ctx.input.isOn && hasRole) return 'the member has this role already';
			if (!ctx.input.isOn && !hasRole) return 'the member does not have this role';
			return !ctx.input.isOn && ctx.input.role === 'owner' && lastOwnerIs(ctx, membership.individual, membership.group) ? 'a group keeps one owner at least' : '';
		},
		plan: (ctx, fx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			const roleList = ctx.input.isOn
				? [...membership.roleList, { role: ctx.input.role, from: ctx.time }]
				: membership.roleList.map((one) => (one.role === ctx.input.role && zenePeriodHolds(one, ctx.time, { isMaybeHeld: true }) ? { ...one, to: ctx.time } : one));
			fx.update('membership', membership.id, { roleList });
		},
	},
	{
		id: 'membership.remove', group: 'group', label: 'Remove a member',
		whoText: 'an owner or admin of the group; an owner is never removed',
		inputText: 'membership',
		effectText: ['update membership (removed, its roles ended)'],
		who: (ctx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			return signedIn(ctx) || (membership && zeneGroupManageIs(ctx.world, ctx.actor.personId, membership.group, ctx.time) ? '' : 'only its owners and admins remove members');
		},
		check: (ctx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			if (!zeneMembershipHolds(membership, ctx.time)) return 'not a member now';
			if (membership.individual === ctx.actor.personId) return 'leave the group instead';
			return zeneMembershipRoleList(membership, ctx.time).includes('owner') ? 'an owner is not removed: they leave' : '';
		},
		plan: (ctx, fx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			fx.update('membership', membership.id, { period: { ...membership.period, to: ctx.time }, endReason: 'removed', roleList: roleListEnded(membership.roleList, ctx.time) });
		},
	},
	{
		id: 'membership.historySet', group: 'group', label: 'Tell the history of a membership',
		whoText: 'an owner or admin of the group; the periods of owner and admin, an owner',
		inputText: 'membership; its period, and the periods of its roles: each end a year, a month, a day or a moment, the end left open while it goes on',
		effectText: ['update membership (its period, the periods of its roles)'],
		who: (ctx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			if (!membership) return signedIn(ctx) || 'there is no such membership';
			const standing = zeneGroupStandingOf(ctx.world, ctx.actor.personId, membership.group, ctx.time);
			if (!['owner', 'admin'].includes(standing)) return signedIn(ctx) || 'only its owners and admins tell the history of the group';
			const manageText = (roleList) => JSON.stringify(roleList.filter((one) => zeneRoleManageIs(one.role)));
			return ctx.input.roleList && standing !== 'owner' && manageText(ctx.input.roleList) !== manageText(membership.roleList) ? 'only an owner tells when owners and admins were' : '';
		},
		check: (ctx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			const { period, roleList } = historyAfter(ctx, membership);
			const reason = zenePeriodCheck(period);
			if (reason) return `the membership: ${reason}`;
			for (const one of roleList) {
				if (!zeneRoleManageIs(one.role) && !ctx.world.get('tag', one.role)?.kindList.includes('role')) return 'a role is owner, admin, or a tag of the kind role';
				const roleReason = zenePeriodCheck(one);
				if (roleReason) return `the role ${roleLabel(ctx, one.role)}: ${roleReason}`;
				if (zenePeriodWithin(one, period, ctx.time) === 'no') return `the role ${roleLabel(ctx, one.role)} lies outside the membership`;
			}
			// a group keeps one owner at least, now
			const after = { ...membership, period, roleList };
			const ownerList = (ctx.world.membershipByGroup.get(membership.group) ?? []).map((one) => (one.id === membership.id ? after : one))
				.filter((one) => zeneMembershipHolds(one, ctx.time) && one.roleList.some((role) => role.role === 'owner' && zenePeriodHolds(role, ctx.time)));
			return ownerList.length === 0 ? 'a group keeps one owner at least' : '';
		},
		plan: (ctx, fx) => {
			const membership = ctx.world.get('membership', ctx.input.membership);
			const after = historyAfter(ctx, membership);
			const change = {};
			if (ctx.input.period) {
				change.period = after.period;
				// an end told for the membership is how it ended; opened again, it goes on
				change.endReason = after.period.to ? membership.endReason || 'left' : '';
			}
			if (JSON.stringify(after.roleList) !== JSON.stringify(membership.roleList)) change.roleList = after.roleList;
			fx.update('membership', membership.id, change);
		},
	},
	// --- subgroups ------------------------------------------------------------------------------
	{
		id: 'subgroup.create', group: 'subgroup', label: 'Form a subgroup',
		whoText: 'a member of the group',
		inputText: 'group, name, description, tags, open or by its leads',
		effectText: ['create subgroup (the creator its lead)'],
		who: (ctx) => signedIn(ctx) || (zeneMembershipActiveGet(ctx.world, ctx.actor.personId, ctx.input.group, ctx.time) ? '' : 'only members form subgroups'),
		check: (ctx) => named(ctx.input.name),
		plan: (ctx, fx) => ({
			subgroupId: fx.create('subgroup', {
				group: ctx.input.group, name: ctx.input.name.trim(), description: ctx.input.description ?? '', tagList: ctx.input.tagList ?? [],
				joinPolicy: ctx.input.joinPolicy ?? 'open', memberList: [{ individual: ctx.actor.personId, role: 'lead', from: ctx.time }],
			}),
		}),
	},
	{
		id: 'subgroup.join', group: 'subgroup', label: 'Join a subgroup',
		whoText: 'a member of the group; the subgroup lets members join',
		inputText: 'subgroup',
		effectText: ['update subgroup (a member added)'],
		who: (ctx) => {
			const subgroup = ctx.world.get('subgroup', ctx.input.subgroup);
			return signedIn(ctx) || (subgroup && zeneMembershipActiveGet(ctx.world, ctx.actor.personId, subgroup.group, ctx.time) ? '' : 'only members of the group join its subgroups');
		},
		check: (ctx) => {
			const subgroup = ctx.world.get('subgroup', ctx.input.subgroup);
			if (zeneSubgroupMemberList(subgroup, ctx.time).some((one) => one.individual === ctx.actor.personId)) return 'you are in it already';
			return subgroup.joinPolicy === 'open' ? '' : 'its leads add its members';
		},
		plan: (ctx, fx) => {
			const subgroup = ctx.world.get('subgroup', ctx.input.subgroup);
			fx.update('subgroup', subgroup.id, { memberList: [...subgroup.memberList, { individual: ctx.actor.personId, role: 'member', from: ctx.time }] });
		},
	},
	{
		id: 'subgroup.leave', group: 'subgroup', label: 'Leave a subgroup',
		whoText: 'a member of the subgroup',
		inputText: 'subgroup',
		effectText: ['update subgroup (the period of the member ended)'],
		who: (ctx) => {
			const subgroup = ctx.world.get('subgroup', ctx.input.subgroup);
			return signedIn(ctx) || (subgroup && zeneSubgroupMemberList(subgroup, ctx.time).some((one) => one.individual === ctx.actor.personId) ? '' : 'you are not in this subgroup');
		},
		plan: (ctx, fx) => {
			const subgroup = ctx.world.get('subgroup', ctx.input.subgroup);
			fx.update('subgroup', subgroup.id, { memberList: subgroup.memberList.map((one) => (one.individual === ctx.actor.personId && !one.to ? { ...one, to: ctx.time } : one)) });
		},
	},
	// --- applications ---------------------------------------------------------------------------
	{
		id: 'application.accept', group: 'application', label: 'Accept an application',
		whoText: 'who decides for its target: owners and admins of a group, organizers of an event, leads of a subgroup',
		inputText: 'application',
		effectText: ['update application (accepted)', 'group: create membership', 'event: update event (a performer added, an open position filled)', 'subgroup: update subgroup (a member added)'],
		who: (ctx) => applicationDecideWho(ctx),
		check: (ctx) => applicationPending(ctx),
		plan: (ctx, fx) => {
			const application = ctx.world.get('application', ctx.input.application);
			fx.update('application', application.id, { status: 'accepted', timeDecided: ctx.time, decidedBy: ctx.actor.accountId });
			const { kind, id } = application.target;
			if (kind === 'group' && !zeneMembershipActiveGet(ctx.world, application.applicant, id, ctx.time)) {
				return { membershipId: fx.create('membership', { group: id, individual: application.applicant, period: { from: ctx.time }, roleList: [], skillList: application.skillList, via: application.id }) };
			}
			if (kind === 'event') {
				const event = fx.current('event', id);
				const principalList = event.principalList.some((one) => one.kind === 'individual' && one.id === application.applicant)
					? event.principalList
					: [...event.principalList, { kind: 'individual', id: application.applicant, role: 'performer', status: 'confirmed', skillList: application.skillList }];
				fx.update('event', id, { principalList, openList: openListFilled(ctx, event.openList, application.skillList) });
			}
			if (kind === 'subgroup') {
				const subgroup = fx.current('subgroup', id);
				if (!zeneSubgroupMemberList(subgroup, ctx.time).some((one) => one.individual === application.applicant)) fx.update('subgroup', id, { memberList: [...subgroup.memberList, { individual: application.applicant, role: 'member', from: ctx.time }] });
			}
			return {};
		},
	},
	{
		id: 'application.decline', group: 'application', label: 'Decline an application',
		whoText: 'who decides for its target',
		inputText: 'application',
		effectText: ['update application (declined)'],
		who: (ctx) => applicationDecideWho(ctx),
		check: (ctx) => applicationPending(ctx),
		plan: (ctx, fx) => fx.update('application', ctx.input.application, { status: 'declined', timeDecided: ctx.time, decidedBy: ctx.actor.accountId }),
	},
	{
		id: 'application.withdraw', group: 'application', label: 'Withdraw an application',
		whoText: 'the applicant',
		inputText: 'application',
		effectText: ['update application (withdrawn)'],
		who: (ctx) => signedIn(ctx) || (ctx.world.get('application', ctx.input.application)?.applicant === ctx.actor.personId ? '' : 'only the applicant withdraws it'),
		check: (ctx) => applicationPending(ctx),
		plan: (ctx, fx) => fx.update('application', ctx.input.application, { status: 'withdrawn', timeDecided: ctx.time }),
	},
	// --- events ---------------------------------------------------------------------------------
	{
		id: 'event.create', group: 'event', label: 'Create an event',
		whoText: 'anyone signed in, as themselves or as a group they manage: that one is its organizer',
		inputText: 'name, kind, commercial or not, times, venue, description, tags, program, open positions, handle of its account',
		effectText: ['create event (a draft)', 'create account (of the event, temporary)'],
		who: (ctx) => asManaged(ctx) || (['individual', 'group'].includes(ctx.account?.subject.kind) ? '' : 'an event is organized by a person or a group'),
		check: (ctx) => first(named(ctx.input.name), timeAfter(ctx.input.timeStart, ctx.input.timeEnd),
			ZENE_EVENT_KIND_LIST.includes(ctx.input.eventKind ?? 'concert') ? '' : 'an unknown kind of event',
			ctx.input.eventKind === 'rehearsal' ? 'a rehearsal belongs to an event: add it there' : '',
			ctx.input.handle ? handleFree(ctx, ctx.input.handle) : ''),
		plan: (ctx, fx) => {
			const eventId = ctx.idNew();
			const accountId = ctx.idNew();
			const event = {
				id: eventId, name: ctx.input.name.trim(), account: accountId, eventKind: ctx.input.eventKind ?? 'concert', isCommercial: ctx.input.isCommercial === true,
				status: 'draft', visibility: 'public', timeStart: ctx.input.timeStart, timeEnd: ctx.input.timeEnd ?? '', venue: ctx.input.venue ?? {}, description: ctx.input.description ?? '',
				principalList: [{ kind: ctx.account.subject.kind, id: ctx.account.subject.id, role: 'organizer', status: 'confirmed' }],
				tagList: ctx.input.tagList ?? [], programList: ctx.input.programList ?? [], openList: ctx.input.openList ?? [], ticket: ctx.input.ticket ?? {},
			};
			fx.create('event', event);
			fx.create('account', {
				id: accountId, handle: handleClean(ctx.input.handle || `${eventId}`), name: event.name, subject: { kind: 'event', id: eventId },
				bio: event.description, avatar: { seed: accountId }, isTemporary: true, timeExpire: zeneTimeText(zeneEventAccountExpireOf(event), zeneTimeZoneOf(event.timeStart)),
				viewList: ['about', 'post'],
			});
			return { eventId, accountId };
		},
	},
	{
		id: 'event.update', group: 'event', label: 'Edit an event',
		whoText: 'an organizer of the event (of its parent, for a rehearsal)',
		inputText: 'event; name, times, venue, description, tags, program, open positions, ticket',
		effectText: ['update event'],
		who: (ctx) => eventManageWho(ctx),
		check: (ctx) => {
			const event = ctx.world.get('event', ctx.input.event);
			return ctx.input.timeStart || ctx.input.timeEnd ? timeAfter(ctx.input.timeStart ?? event.timeStart, ctx.input.timeEnd ?? event.timeEnd) : '';
		},
		plan: (ctx, fx) => fx.update('event', ctx.input.event, pick(ctx.input, ['name', 'isCommercial', 'timeStart', 'timeEnd', 'venue', 'description', 'tagList', 'programList', 'openList', 'ticket', 'visibility'])),
	},
	{
		id: 'event.publish', group: 'event', label: 'Publish an event',
		whoText: 'an organizer of the event',
		inputText: 'event',
		effectText: ['update event (published)'],
		who: (ctx) => eventManageWho(ctx),
		check: (ctx) => (ctx.world.get('event', ctx.input.event).status === 'draft' ? '' : 'only a draft is published'),
		plan: (ctx, fx) => fx.update('event', ctx.input.event, { status: 'published' }),
	},
	{
		id: 'event.cancel', group: 'event', label: 'Cancel an event',
		whoText: 'an organizer of the event',
		inputText: 'event',
		effectText: ['update event (cancelled)'],
		who: (ctx) => eventManageWho(ctx),
		check: (ctx) => {
			const event = ctx.world.get('event', ctx.input.event);
			if (event.status === 'cancelled') return 'cancelled already';
			return eventEndedIs(ctx, event) ? 'it is over' : '';
		},
		plan: (ctx, fx) => fx.update('event', ctx.input.event, { status: 'cancelled' }),
	},
	{
		id: 'event.invite', group: 'event', label: 'Invite to an event',
		whoText: 'an organizer of the event',
		inputText: 'event, a group or an individual, the role',
		effectText: ['update event (a principal invited)'],
		who: (ctx) => eventManageWho(ctx),
		check: (ctx) => {
			const principal = ctx.input.principal ?? {};
			if (!['group', 'individual'].includes(principal.kind) || !ctx.world.get(principal.kind, principal.id)) return 'invite a group or an individual of the community';
			const one = ctx.world.get('event', ctx.input.event).principalList.find((item) => item.kind === principal.kind && item.id === principal.id);
			return one && one.status !== 'declined' ? 'invited already' : '';
		},
		plan: (ctx, fx) => {
			const event = ctx.world.get('event', ctx.input.event);
			const { kind, id } = ctx.input.principal;
			const rest = event.principalList.filter((one) => !(one.kind === kind && one.id === id));
			fx.update('event', event.id, { principalList: [...rest, { kind, id, role: ctx.input.role ?? 'performer', status: 'invited' }] });
		},
	},
	{
		id: 'event.inviteAnswer', group: 'event', label: 'Answer an invitation',
		whoText: 'the one invited: the individual, or an owner or admin of the group',
		inputText: 'event, the principal invited, yes or no',
		effectText: ['update event (the principal confirmed or declined)'],
		who: (ctx) => {
			const event = ctx.world.get('event', ctx.input.event);
			if (!event) return signedIn(ctx) || 'there is no such event';
			const mine = zeneEventPrincipalListOf(ctx.world, ctx.actor.personId, event, ctx.time).some((one) => principalSame(one, ctx.input.principal));
			return signedIn(ctx) || (mine ? '' : 'you do not answer for this invitation');
		},
		check: (ctx) => (principalOf(ctx)?.status === 'invited' ? '' : 'there is no invitation waiting'),
		plan: (ctx, fx) => {
			const event = ctx.world.get('event', ctx.input.event);
			fx.update('event', event.id, { principalList: event.principalList.map((one) => (principalSame(one, ctx.input.principal) ? { ...one, status: ctx.input.isAccepted ? 'confirmed' : 'declined' } : one)) });
		},
	},
	{
		id: 'event.apply', group: 'event', label: 'Apply to take part',
		whoText: 'anyone signed in who does not take part yet, with no application waiting',
		inputText: 'event, a message, what they play, the post it answers',
		effectText: ['create application (pending)'],
		who: signedIn,
		check: (ctx) => {
			const event = ctx.world.get('event', ctx.input.event);
			if (!event || event.status !== 'published') return 'the event does not take applications';
			if (eventEndedIs(ctx, event)) return 'the event is over';
			if (zeneEventParticipantIs(ctx.world, ctx.actor.personId, event, ctx.time)) return 'you take part already';
			return pendingOf(ctx, ctx.actor.personId, { kind: 'event', id: event.id }) ? 'your application is waiting already' : '';
		},
		plan: (ctx, fx) => ({ applicationId: applicationCreate(ctx, fx, { kind: 'event', id: ctx.input.event }) }),
	},
	{
		id: 'rehearsal.create', group: 'event', label: 'Add a rehearsal',
		whoText: 'an organizer of the event',
		inputText: 'event, times, venue, a note',
		effectText: ['create event (a rehearsal of the event, seen by its participants)'],
		who: (ctx) => signedIn(ctx) || (zeneEventOrganizerIs(ctx.world, ctx.actor.personId, ctx.input.event, ctx.time) ? '' : 'only its organizers add rehearsals'),
		check: (ctx) => first(ctx.world.get('event', ctx.input.event).eventKind === 'rehearsal' ? 'a rehearsal has no rehearsals' : '', timeAfter(ctx.input.timeStart, ctx.input.timeEnd)),
		plan: (ctx, fx) => {
			const parent = ctx.world.get('event', ctx.input.event);
			const count = (ctx.world.eventByParent.get(parent.id) ?? []).length + 1;
			return {
				eventId: fx.create('event', {
					name: ctx.input.name?.trim() || `Rehearsal ${count}: ${parent.name}`, eventKind: 'rehearsal', parent: parent.id, status: 'published', visibility: 'member',
					timeStart: ctx.input.timeStart, timeEnd: ctx.input.timeEnd ?? '', venue: ctx.input.venue ?? parent.venue, description: ctx.input.description ?? '',
					principalList: parent.principalList.filter((one) => one.role === 'organizer' && one.status === 'confirmed'), programList: parent.programList,
				}),
			};
		},
	},
	// --- posts ----------------------------------------------------------------------------------
	{
		id: 'post.create', group: 'post', label: 'Post',
		whoText: 'whoever may act as the account posting; a hiring post is for a group or an event that account manages',
		inputText: 'kind, text, tags, pictures, the event, for hiring: what for, which skill, how many, what is required',
		effectText: ['create post'],
		who: asManaged,
		check: (ctx) => {
			if (!ZENE_POST_KIND_LIST.includes(ctx.input.postKind ?? 'general')) return 'an unknown kind of post';
			if (!String(ctx.input.text ?? '').trim() && !(ctx.input.media ?? []).length) return 'write something';
			if (zeneAccountExpiredIs(ctx.account, ctx.time)) return 'this event account has expired';
			if (ctx.input.event && !ctx.world.get('event', ctx.input.event)) return 'there is no such event';
			if (ctx.input.postKind !== 'hiring') return '';
			const target = ctx.input.hiring?.target ?? {};
			if (!ctx.world.get('tag', ctx.input.hiring?.tag)) return 'say which skill is looked for';
			if (target.kind === 'group') return zeneGroupManageIs(ctx.world, ctx.actor.personId, target.id, ctx.time) ? '' : 'you hire only for a group you manage';
			if (target.kind === 'event') return zeneEventManageIs(ctx.world, ctx.actor.personId, target.id, ctx.time) ? '' : 'you hire only for an event you organize';
			return 'say what the hiring is for: a group or an event';
		},
		plan: (ctx, fx) => ({
			postId: fx.create('post', {
				account: ctx.actor.accountId, postKind: ctx.input.postKind ?? 'general', text: String(ctx.input.text ?? '').trim(), event: ctx.input.event ?? '',
				tagList: ctx.input.tagList ?? [], media: ctx.input.media ?? [], ...(ctx.input.postKind === 'hiring' ? { hiring: { ...ctx.input.hiring, isOpen: true } } : {}),
			}),
		}),
	},
	{
		id: 'post.delete', group: 'post', label: 'Delete a post',
		whoText: 'whoever may act as the account that posted it',
		inputText: 'post',
		effectText: ['delete post'],
		who: (ctx) => postManageWho(ctx),
		plan: (ctx, fx) => fx.delete('post', ctx.input.post),
	},
	{
		id: 'post.hiringClose', group: 'post', label: 'Close a hiring post',
		whoText: 'whoever may act as the account that posted it',
		inputText: 'post',
		effectText: ['update post (hiring closed)'],
		who: (ctx) => postManageWho(ctx),
		check: (ctx) => (ctx.world.get('post', ctx.input.post).hiring?.isOpen ? '' : 'it is not an open hiring post'),
		plan: (ctx, fx) => fx.update('post', ctx.input.post, { hiring: { ...ctx.world.get('post', ctx.input.post).hiring, isOpen: false } }),
	},
	{
		id: 'hiring.apply', group: 'post', label: 'Apply to a hiring post',
		whoText: 'anyone signed in who is not in what it hires for, with no application waiting',
		inputText: 'post, a message, what they play',
		effectText: ['create application (pending) for the group or event of the post'],
		who: signedIn,
		check: (ctx) => {
			const post = ctx.world.get('post', ctx.input.post);
			if (!post?.hiring?.isOpen) return 'it does not hire now';
			const { kind, id } = post.hiring.target;
			const target = ctx.world.get(kind, id);
			if (!target) return 'what it hires for is gone';
			if (kind === 'group' && zeneMembershipActiveGet(ctx.world, ctx.actor.personId, id, ctx.time)) return 'you are a member already';
			if (kind === 'event' && zeneEventParticipantIs(ctx.world, ctx.actor.personId, target, ctx.time)) return 'you take part already';
			return pendingOf(ctx, ctx.actor.personId, post.hiring.target) ? 'your application is waiting already' : '';
		},
		plan: (ctx, fx) => {
			const post = ctx.world.get('post', ctx.input.post);
			const skillList = [...new Set([post.hiring.tag, ...(ctx.input.skillList ?? [])])];
			return { applicationId: applicationCreate(ctx, fx, post.hiring.target, { via: post.id, skillList }) };
		},
	},
	// --- tags -----------------------------------------------------------------------------------
	{
		id: 'tag.create', group: 'tag', label: 'Add a tag',
		whoText: 'anyone signed in',
		inputText: 'label, kinds, parents; for a work its composers and the work it comes from',
		effectText: ['update taxonomy (a tag added; create taxonomy when the community has none)'],
		who: signedIn,
		check: (ctx) => {
			const label = String(ctx.input.label ?? '').trim();
			if (!label) return 'give a label';
			const kindList = ctx.input.kindList ?? [];
			if (kindList.length === 0 || kindList.some((one) => !ZENE_TAG_KIND_LIST.includes(one))) return `a tag is of the kinds ${ZENE_TAG_KIND_LIST.join(', ')}`;
			const twin = ctx.world.list('tag').find((one) => one.label.toLowerCase() === label.toLowerCase() && one.kindList.some((kind) => kindList.includes(kind)));
			if (twin) return `the tag ${twin.label} is there already`;
			return [...(ctx.input.parentList ?? []), ...(ctx.input.composerList ?? []), ...(ctx.input.originList ?? [])].every((id) => ctx.world.get('tag', id)) ? '' : 'a tag named above it is not there';
		},
		plan: (ctx, fx) => {
			const tagId = ctx.idNew();
			const tag = { id: tagId, label: ctx.input.label.trim(), ...pick(ctx.input, ['kindList', 'parentList', 'composerList', 'originList', 'icon', 'note']), timeCreated: ctx.time, createdBy: ctx.actor.accountId };
			const taxonomy = ctx.world.list('taxonomy')[0];
			if (taxonomy) fx.update('taxonomy', taxonomy.id, { tagList: [...fx.current('taxonomy', taxonomy.id).tagList, tag] });
			else fx.create('taxonomy', { name: 'Tags', tagList: [tag] });
			return { tagId };
		},
	},
	// --- availability (doc/zene-availability.md) -------------------------------------------------
	{
		id: 'availability.declare', group: 'availability', label: 'Declare when one can play',
		whoText: 'the person themselves; for a group, its owners and admins',
		inputText: 'whose (a person or a group); a declaration: a state, a span (always, a year, a season, a month, a week, days, a day), weekdays, parts of the day or hours, a note; with the id of one declared before, it replaces it',
		effectText: ['update availability (a declaration added or replaced)', 'create availability (the first time)'],
		who: (ctx) => subjectManageWho(ctx, ctx.input.subject),
		check: (ctx) => zeneDeclarationCheck(ctx.input.declaration ?? {}),
		plan: (ctx, fx) => {
			const declarationId = ctx.input.declaration.id || ctx.idNew();
			const declaration = { ...ctx.input.declaration, id: declarationId, timeDeclared: ctx.time };
			availabilityChange(ctx, fx, (availability) => ({
				declarationList: availability.declarationList.some((one) => one.id === declarationId)
					? availability.declarationList.map((one) => (one.id === declarationId ? declaration : one))
					: [...availability.declarationList, declaration],
			}));
			return { declarationId };
		},
	},
	{
		id: 'availability.remove', group: 'availability', label: 'Take back a declaration',
		whoText: 'the person themselves; for a group, its owners and admins',
		inputText: 'whose, the id of the declaration',
		effectText: ['update availability (a declaration taken out)'],
		who: (ctx) => subjectManageWho(ctx, ctx.input.subject),
		check: (ctx) => (availabilityOf(ctx)?.declarationList.some((one) => one.id === ctx.input.declarationId) ? '' : 'there is no such declaration'),
		plan: (ctx, fx) => availabilityChange(ctx, fx, (availability) => ({ declarationList: availability.declarationList.filter((one) => one.id !== ctx.input.declarationId) })),
	},
	{
		id: 'availability.currentSet', group: 'availability', label: 'Say how one is now',
		whoText: 'the person themselves; for a group, its owners and admins',
		inputText: "whose; a state (empty: say nothing), a note, the day it holds until",
		effectText: ['update availability (its current state)', 'create availability (the first time)'],
		who: (ctx) => subjectManageWho(ctx, ctx.input.subject),
		check: (ctx) => {
			if (ctx.input.state && !ZENE_AVAILABILITY_STATE_LIST.some((one) => one.id === ctx.input.state)) return 'an unknown state';
			return ctx.input.until && Number.isNaN(zeneDayOf(ctx.input.until)) ? 'the day it holds until is a date: 2027-01-31' : '';
		},
		plan: (ctx, fx) => availabilityChange(ctx, fx, () => ({
			current: ctx.input.state ? { state: ctx.input.state, note: String(ctx.input.note ?? '').trim(), until: ctx.input.until ?? '', timeDeclared: ctx.time } : null,
		})),
	},
];

const ACTION_BY_ID = new Map(ZENE_ACTION_LIST.map((action) => [action.id, action]));

export function zeneActionGet(actionId) {
	return ACTION_BY_ID.get(actionId);
}

export const ZENE_ACTION_GROUP_LIST = [
	{ id: 'account', label: 'Accounts and profiles' },
	{ id: 'group', label: 'Groups and memberships' },
	{ id: 'subgroup', label: 'Subgroups' },
	{ id: 'application', label: 'Applications' },
	{ id: 'event', label: 'Events' },
	{ id: 'post', label: 'Posts and hiring' },
	{ id: 'tag', label: 'Tags' },
	{ id: 'availability', label: 'Availability' },
];

// --- running --------------------------------------------------------------------------------

function ctxBuild(world, { actor = {}, input = {}, time, idNew }) {
	return {
		world,
		actor: { personId: actor.personId ?? '', accountId: actor.accountId ?? '' },
		input,
		time,
		idNew,
		person: actor.personId ? world.get('individual', actor.personId) : undefined,
		account: actor.accountId ? world.get('account', actor.accountId) : undefined,
	};
}

// '' when the actor may do the action, else why not; with input, whether what is asked is
// possible too. A button asks this to be shown enabled, and says the reason as its title
export function zeneActionReasonGet(world, { actionId, actor, input = {}, time, isInputChecked = false }) {
	const action = ACTION_BY_ID.get(actionId);
	if (!action) return `there is no action ${actionId}`;
	const ctx = ctxBuild(world, { actor, input, time, idNew: () => '' });
	try {
		return action.who(ctx) || (isInputChecked && action.check ? action.check(ctx) : '');
	} catch {
		return 'what is asked does not fit the data';
	}
}

// the effects of an action, without applying them: { code, message, data: { effectList, result, stage? } }
export function zeneActionRun(world, { actionId, actor, input = {}, time, idNew }) {
	const action = ACTION_BY_ID.get(actionId);
	if (!action) return { code: -1, message: `there is no action ${actionId}`, data: { stage: 'action' } };
	const ctx = ctxBuild(world, { actor, input, time, idNew });
	let reason;
	try {
		reason = action.who(ctx);
	} catch (error) {
		return { code: -1, message: `who may do it could not be told: ${error.message}`, data: { stage: 'who' } };
	}
	if (reason) return { code: ctx.actor.personId ? ZENE_CODE_FORBIDDEN : ZENE_CODE_SIGN_IN, message: reason, data: { stage: 'who' } };
	try {
		reason = action.check ? action.check(ctx) : '';
	} catch (error) {
		return { code: -1, message: `what is asked does not fit the data: ${error.message}`, data: { stage: 'check' } };
	}
	if (reason) return { code: -1, message: reason, data: { stage: 'check' } };
	const fx = effectCollectorCreate(ctx);
	const result = action.plan(ctx, fx) ?? {};
	return { code: 0, message: '', data: { effectList: fx.effectList, result } };
}

// the effects of an action as one list, each entity once: a later change of the same entity in
// the same plan is merged into its earlier effect
function effectCollectorCreate(ctx) {
	const effectList = [];
	const effectOf = (kind, id) => effectList.find((one) => one.kind === kind && one.id === id);
	const current = (kind, id) => {
		const effect = effectOf(kind, id);
		if (effect) return effect.op === 'delete' ? undefined : zeneEntityNormalize(kind, effect.data);
		return ctx.world.get(kind, id);
	};
	return {
		effectList,
		current,
		create(kind, data, { createdBy } = {}) {
			const id = data.id || ctx.idNew();
			effectList.push({ op: 'create', kind, id, data: zeneEntityCompact({ ...data, id, timeCreated: ctx.time, createdBy: createdBy ?? ctx.actor.accountId }) });
			return id;
		},
		update(kind, id, patch) {
			const before = current(kind, id);
			if (!before) throw new Error(`${kind} ${id} is not there`);
			const data = zeneEntityCompact({ ...before, ...patch });
			const effect = effectOf(kind, id);
			if (effect) {
				effect.data = data;
				effect.fieldList = [...new Set([...(effect.fieldList ?? []), ...Object.keys(patch)])];
			} else effectList.push({ op: 'update', kind, id, data, fieldList: Object.keys(patch) });
		},
		delete(kind, id) {
			const effect = effectOf(kind, id);
			if (effect?.op === 'create') effectList.splice(effectList.indexOf(effect), 1);
			else if (effect) Object.assign(effect, { op: 'delete', data: undefined, fieldList: undefined });
			else effectList.push({ op: 'delete', kind, id });
		},
	};
}

// what an item keeps of an entity: no empty text, empty list or empty mapping
export function zeneEntityCompact(value) {
	if (Array.isArray(value)) return value.map(zeneEntityCompact);
	if (!value || typeof value !== 'object') return value;
	const out = {};
	for (const [key, one] of Object.entries(value)) {
		const compact = zeneEntityCompact(one);
		if (compact === undefined || compact === null || compact === '') continue;
		if (Array.isArray(compact) && compact.length === 0) continue;
		if (compact && typeof compact === 'object' && !Array.isArray(compact) && Object.keys(compact).length === 0) continue;
		out[key] = compact;
	}
	return out;
}

// the entities after the effects: a Map of `${kind}:${id}` -> { kind, data }, changed in place
export function zeneEffectListApply(entryByKey, effectList) {
	for (const effect of effectList) {
		const key = `${effect.kind}:${effect.id}`;
		if (effect.op === 'delete') entryByKey.delete(key);
		else entryByKey.set(key, { kind: effect.kind, data: effect.data });
	}
	return entryByKey;
}

// --- helpers of the actions ---------------------------------------------------------------------

// who may speak for a person or a group: the person; the owners and admins of the group
function subjectManageWho(ctx, subject) {
	const reason = signedIn(ctx);
	if (reason) return reason;
	if (subject?.kind === 'individual') return subject.id === ctx.actor.personId ? '' : 'only the person says when they can play';
	if (subject?.kind === 'group') return zeneGroupManageIs(ctx.world, ctx.actor.personId, subject.id, ctx.time) ? '' : 'only its owners and admins say when a group can play';
	return 'availability is a person\'s or a group\'s';
}

function availabilityOf(ctx) {
	const subject = ctx.input.subject ?? {};
	return ctx.world.availabilityOfSubject(subject.kind, subject.id);
}

// the availability of the subject changed; made with the change when the subject has none yet
function availabilityChange(ctx, fx, change) {
	const availability = availabilityOf(ctx);
	if (availability) {
		fx.update('availability', availability.id, change(fx.current('availability', availability.id)));
		return;
	}
	const subject = { kind: ctx.input.subject.kind, id: ctx.input.subject.id };
	const empty = { subject, zone: zeneTimeZoneOf(ctx.time) >= 0 ? `+${String(zeneTimeZoneOf(ctx.time)).padStart(2, '0')}` : `-${String(-zeneTimeZoneOf(ctx.time)).padStart(2, '0')}`, current: null, declarationList: [] };
	fx.create('availability', { ...empty, ...change(empty) });
}

function followOf(ctx) {
	return (ctx.world.followByFrom.get(ctx.actor.accountId) ?? []).find((one) => one.to === ctx.input.account);
}

function joinPolicyCheck(policy) {
	return policy === undefined || ZENE_JOIN_POLICY_LIST.includes(policy) ? '' : `members join a group in one of the ways ${ZENE_JOIN_POLICY_LIST.join(', ')}`;
}

function memberNot(ctx) {
	return zeneMembershipActiveGet(ctx.world, ctx.actor.personId, ctx.input.group, ctx.time) ? 'you are a member already' : '';
}

// the history of a membership after it is told: its period, and its roles; an end told for the
// membership, without its roles told again, ends the roles still open with it
function historyAfter(ctx, membership) {
	const period = ctx.input.period ?? membership.period;
	const roleList = ctx.input.roleList ?? (ctx.input.period?.to ? membership.roleList.map((one) => (one.to ? one : { ...one, to: period.to })) : membership.roleList);
	return { period, roleList };
}

function periodReason(what, period) {
	const reason = zenePeriodCheck(period);
	return reason ? `${what}: ${reason}` : '';
}

function pointReason(what, point) {
	const reason = zenePointCheck(point);
	return reason ? `${what}: ${reason}` : '';
}

function roleLabel(ctx, role) {
	return zeneRoleManageIs(role) ? role : ctx.world.get('tag', role)?.label ?? role;
}

function lastOwnerIs(ctx, personId, groupId) {
	const ownerList = zeneGroupOwnerList(ctx.world, groupId, ctx.time);
	return ownerList.length === 1 && ownerList[0].individual === personId;
}

function applicationCreate(ctx, fx, target, { via, skillList } = {}) {
	return fx.create('application', {
		applicant: ctx.actor.personId, target, via: via ?? ctx.input.via ?? '', skillList: skillList ?? ctx.input.skillList ?? [],
		message: String(ctx.input.message ?? '').trim(), status: 'pending',
	});
}

function applicationDecideWho(ctx) {
	const application = ctx.world.get('application', ctx.input.application);
	if (!application) return signedIn(ctx) || 'there is no such application';
	return signedIn(ctx) || (zeneApplicationDecideIs(ctx.world, ctx.actor.personId, application, ctx.time) ? '' : 'you do not decide for what it applies to');
}

function applicationPending(ctx) {
	return ctx.world.get('application', ctx.input.application)?.status === 'pending' ? '' : 'it is not waiting for a decision';
}

function eventManageWho(ctx) {
	if (!ctx.world.get('event', ctx.input.event)) return signedIn(ctx) || 'there is no such event';
	return signedIn(ctx) || (zeneEventManageIs(ctx.world, ctx.actor.personId, ctx.input.event, ctx.time) ? '' : 'only its organizers do this');
}

function postManageWho(ctx) {
	const post = ctx.world.get('post', ctx.input.post);
	if (!post) return signedIn(ctx) || 'there is no such post';
	return signedIn(ctx) || (zeneAccountManageIs(ctx.world, ctx.actor.personId, post.account, ctx.time) ? '' : 'only who may act as its account does this');
}

function principalSame(one, principal) {
	return one.kind === principal?.kind && one.id === principal?.id;
}

function principalOf(ctx) {
	return ctx.world.get('event', ctx.input.event)?.principalList.find((one) => principalSame(one, ctx.input.principal));
}

// an open position of an event taken by someone playing what it asks for (one less to find)
function openListFilled(ctx, openList, skillList) {
	const skillSet = new Set(skillList);
	let isFilled = false;
	return openList.map((one) => {
		if (isFilled) return one;
		const isMatch = [...ctx.world.tag.descendantSet(one.tag)].some((id) => skillSet.has(id));
		if (!isMatch) return one;
		isFilled = true;
		return { ...one, count: one.count - 1 };
	}).filter((one) => one.count > 0);
}
