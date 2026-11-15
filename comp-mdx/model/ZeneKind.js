// The kinds of data items of a music community (doc/zene-data.md). Each entity is one asset
// item of the frontend object, of one of these kinds; its data is yaml (a page is Markdown).
// An entity is found by its kind and id; its asset path is /{partition}/{kind}/{id}, so the
// same entity copied into another partition keeps its id and every reference to it.
//
// The fields listed here are what the model reads; an entity read from an item is completed
// with the defaults (zeneEntityNormalize), so the rest of the model never checks for absence.

export const ZENE_KIND_LIST = [
	{ id: 'account', label: 'Account', lang: 'yaml' },
	{ id: 'individual', label: 'Individual', lang: 'yaml' },
	{ id: 'group', label: 'Music group', lang: 'yaml' },
	{ id: 'membership', label: 'Membership', lang: 'yaml' },
	{ id: 'subgroup', label: 'Subgroup', lang: 'yaml' },
	{ id: 'event', label: 'Music event', lang: 'yaml' },
	{ id: 'post', label: 'Post', lang: 'yaml' },
	{ id: 'application', label: 'Application', lang: 'yaml' },
	{ id: 'follow', label: 'Follow', lang: 'yaml' },
	{ id: 'tag', label: 'Tag', lang: 'yaml' },
	{ id: 'page', label: 'Homepage', lang: 'md' },
];
export const ZENE_KIND_ID_LIST = ZENE_KIND_LIST.map((one) => one.id);
const KIND_BY_ID = new Map(ZENE_KIND_LIST.map((one) => [one.id, one]));

export function zeneKindGet(kind) {
	return KIND_BY_ID.get(kind);
}

// the value sets of the enumerated fields
export const ZENE_ACCOUNT_SUBJECT_KIND_LIST = ['individual', 'group', 'event'];
export const ZENE_JOIN_POLICY_LIST = ['open', 'apply', 'invite'];
export const ZENE_MEMBERSHIP_STATUS_LIST = ['active', 'left', 'removed'];
// the roles that manage a group; every other role of a membership is a tag of the kind role
export const ZENE_ROLE_MANAGE_LIST = ['owner', 'admin'];
export const ZENE_EVENT_KIND_LIST = ['concert', 'rehearsal', 'session', 'workshop', 'audition', 'meetup'];
export const ZENE_EVENT_STATUS_LIST = ['draft', 'published', 'cancelled'];
export const ZENE_PRINCIPAL_ROLE_LIST = ['organizer', 'performer', 'host', 'guest'];
export const ZENE_PRINCIPAL_STATUS_LIST = ['confirmed', 'invited', 'declined'];
export const ZENE_POST_KIND_LIST = ['general', 'performance', 'announcement', 'hiring'];
export const ZENE_APPLICATION_STATUS_LIST = ['pending', 'accepted', 'declined', 'withdrawn'];
export const ZENE_TAG_KIND_LIST = ['skill', 'role', 'genre', 'work', 'composer'];
export const ZENE_ACCOUNT_VIEW_LIST = ['about', 'post', 'event', 'group'];
// an event account stops being usable this long after its event ends
export const ZENE_EVENT_ACCOUNT_KEEP_DAY = 30;

const listOf = (value) => (Array.isArray(value) ? value : []);
const textOf = (value, fallback = '') => (value === undefined || value === null ? fallback : String(value));
const oneOf = (value, list, fallback) => (list.includes(value) ? value : fallback);
const refOf = (value) => ({ kind: textOf(value?.kind), id: textOf(value?.id) });

// an entity as the model reads it: every field there, of its type. `data` is what an item holds
export function zeneEntityNormalize(kind, data = {}) {
	const base = { ...data, id: textOf(data.id), timeCreated: textOf(data.timeCreated), createdBy: textOf(data.createdBy) };
	switch (kind) {
		case 'account':
			return {
				...base,
				handle: textOf(data.handle).toLowerCase(),
				name: textOf(data.name),
				subject: refOf(data.subject),
				bio: textOf(data.bio),
				avatar: { seed: textOf(data.avatar?.seed, base.id), color: textOf(data.avatar?.color), icon: textOf(data.avatar?.icon), style: textOf(data.avatar?.style) },
				homepage: textOf(data.homepage),
				viewList: listOf(data.viewList).filter((view) => ZENE_ACCOUNT_VIEW_LIST.includes(view)),
				isTemporary: data.isTemporary === true,
				timeExpire: textOf(data.timeExpire),
			};
		case 'individual':
			return {
				...base,
				name: textOf(data.name),
				account: textOf(data.account),
				area: textOf(data.area),
				roleList: listOf(data.roleList).map((one) => ({ role: oneOf(one?.role, ['practitioner', 'organizer'], 'practitioner'), timeStart: textOf(one?.timeStart), timeEnd: textOf(one?.timeEnd) })),
				skillList: listOf(data.skillList).map((one) => ({ tag: textOf(one?.tag), level: Math.min(5, Math.max(1, Number(one?.level) || 3)), yearStart: Number(one?.yearStart) || 0, isPrimary: one?.isPrimary === true })),
				workTagList: listOf(data.workTagList).map(textOf),
				lookingForList: listOf(data.lookingForList).map(textOf),
				availability: {
					zone: textOf(data.availability?.zone, '+09'),
					slotList: listOf(data.availability?.slotList).map((one) => ({ day: textOf(one?.day), from: textOf(one?.from), to: textOf(one?.to) })),
					note: textOf(data.availability?.note),
				},
				pricing: {
					isPaidOk: data.pricing?.isPaidOk === true,
					isFreeOk: data.pricing?.isFreeOk !== false,
					itemList: listOf(data.pricing?.itemList).map((one) => ({ label: textOf(one?.label), amount: Number(one?.amount) || 0, currency: textOf(one?.currency, 'JPY'), unit: textOf(one?.unit) })),
					note: textOf(data.pricing?.note),
				},
			};
		case 'group':
			return {
				...base,
				name: textOf(data.name),
				account: textOf(data.account),
				area: textOf(data.area),
				description: textOf(data.description),
				tagList: listOf(data.tagList).map(textOf),
				joinPolicy: oneOf(data.joinPolicy, ZENE_JOIN_POLICY_LIST, 'apply'),
				recruitList: listOf(data.recruitList).map((one) => ({ tag: textOf(one?.tag), count: Number(one?.count) || 1, note: textOf(one?.note) })),
				timeFounded: textOf(data.timeFounded),
			};
		case 'membership':
			return {
				...base,
				group: textOf(data.group),
				individual: textOf(data.individual),
				status: oneOf(data.status, ZENE_MEMBERSHIP_STATUS_LIST, 'active'),
				roleList: listOf(data.roleList).map((one) => ({ role: textOf(one?.role), timeStart: textOf(one?.timeStart), timeEnd: textOf(one?.timeEnd) })),
				skillList: listOf(data.skillList).map(textOf),
				timeJoined: textOf(data.timeJoined),
				timeEnded: textOf(data.timeEnded),
				via: textOf(data.via),
			};
		case 'subgroup':
			return {
				...base,
				group: textOf(data.group),
				name: textOf(data.name),
				description: textOf(data.description),
				tagList: listOf(data.tagList).map(textOf),
				joinPolicy: oneOf(data.joinPolicy, ['open', 'lead'], 'open'),
				memberList: listOf(data.memberList).map((one) => ({ individual: textOf(one?.individual), role: oneOf(one?.role, ['lead', 'member'], 'member'), timeJoined: textOf(one?.timeJoined) })),
			};
		case 'event':
			return {
				...base,
				name: textOf(data.name),
				account: textOf(data.account),
				eventKind: oneOf(data.eventKind, ZENE_EVENT_KIND_LIST, 'concert'),
				isCommercial: data.isCommercial === true,
				status: oneOf(data.status, ZENE_EVENT_STATUS_LIST, 'draft'),
				visibility: oneOf(data.visibility, ['public', 'member'], 'public'),
				timeStart: textOf(data.timeStart),
				timeEnd: textOf(data.timeEnd),
				venue: { name: textOf(data.venue?.name), area: textOf(data.venue?.area) },
				parent: textOf(data.parent),
				description: textOf(data.description),
				principalList: listOf(data.principalList).map((one) => ({
					kind: oneOf(one?.kind, ['group', 'individual'], 'individual'),
					id: textOf(one?.id),
					role: oneOf(one?.role, ZENE_PRINCIPAL_ROLE_LIST, 'performer'),
					status: oneOf(one?.status, ZENE_PRINCIPAL_STATUS_LIST, 'confirmed'),
					skillList: listOf(one?.skillList).map(textOf),
				})),
				tagList: listOf(data.tagList).map(textOf),
				programList: listOf(data.programList).map((one) => ({ tag: textOf(one?.tag), note: textOf(one?.note) })),
				openList: listOf(data.openList).map((one) => ({ tag: textOf(one?.tag), count: Number(one?.count) || 1, note: textOf(one?.note) })),
				ticket: { price: Number(data.ticket?.price) || 0, currency: textOf(data.ticket?.currency, 'JPY'), note: textOf(data.ticket?.note) },
			};
		case 'post':
			return {
				...base,
				account: textOf(data.account),
				postKind: oneOf(data.postKind, ZENE_POST_KIND_LIST, 'general'),
				text: textOf(data.text),
				event: textOf(data.event),
				tagList: listOf(data.tagList).map(textOf),
				media: listOf(data.media).map((one) => ({ kind: oneOf(one?.kind, ['image', 'video', 'audio'], 'image'), title: textOf(one?.title), icon: textOf(one?.icon), color: textOf(one?.color) })),
				hiring: data.hiring ? {
					target: refOf(data.hiring.target),
					tag: textOf(data.hiring.tag),
					count: Number(data.hiring.count) || 1,
					requirement: textOf(data.hiring.requirement),
					isOpen: data.hiring.isOpen !== false,
				} : null,
			};
		case 'application':
			return {
				...base,
				applicant: textOf(data.applicant),
				target: refOf(data.target),
				via: textOf(data.via),
				skillList: listOf(data.skillList).map(textOf),
				message: textOf(data.message),
				status: oneOf(data.status, ZENE_APPLICATION_STATUS_LIST, 'pending'),
				timeDecided: textOf(data.timeDecided),
				decidedBy: textOf(data.decidedBy),
			};
		case 'follow':
			return { ...base, from: textOf(data.from), to: textOf(data.to) };
		case 'tag':
			return {
				...base,
				label: textOf(data.label),
				kindList: listOf(data.kindList).filter((one) => ZENE_TAG_KIND_LIST.includes(one)),
				parentList: listOf(data.parentList).map(textOf),
				composerList: listOf(data.composerList).map(textOf),
				originList: listOf(data.originList).map(textOf),
				icon: textOf(data.icon),
				color: textOf(data.color),
				note: textOf(data.note),
			};
		case 'page':
			return { ...base, account: textOf(data.account), text: textOf(data.text) };
		default:
			return base;
	}
}

// the asset path of an entity in a partition: /{partition}/{kind}/{id}
export function zeneEntityPathBuild(partition, kind, id) {
	return `/${partition}/${kind}/${id}`;
}

// { partition, kind, id } of an asset path written so; undefined for another path
export function zeneEntityPathParse(path) {
	const match = /^\/([A-Za-z0-9_-]+)\/([a-z]+)\/([0-9a-z]+)$/.exec(String(path ?? ''));
	if (!match || !KIND_BY_ID.has(match[2])) return undefined;
	return { partition: match[1], kind: match[2], id: match[3] };
}

// the name the record of an entity's item carries, for people browsing the object
export function zeneEntityNameGet(world, kind, entity) {
	switch (kind) {
		case 'account': return `@${entity.handle}`;
		case 'individual': case 'group': case 'subgroup': case 'event': return entity.name;
		case 'tag': return entity.label;
		case 'post': return `${world?.accountLabelGet?.(entity.account) ?? entity.account}: ${entity.text.slice(0, 40)}`;
		case 'application': return `${world?.labelGet?.('individual', entity.applicant) ?? entity.applicant} → ${world?.labelGet?.(entity.target.kind, entity.target.id) ?? entity.target.id}`;
		case 'membership': return `${world?.labelGet?.('individual', entity.individual) ?? entity.individual} in ${world?.labelGet?.('group', entity.group) ?? entity.group}`;
		case 'follow': return `${world?.accountLabelGet?.(entity.from) ?? entity.from} → ${world?.accountLabelGet?.(entity.to) ?? entity.to}`;
		case 'page': return `Homepage ${world?.accountLabelGet?.(entity.account) ?? ''}`.trim();
		default: return entity.id;
	}
}

// a page is Markdown: its text is the item, its account is written in its frontmatter
export function zenePageTextBuild(page) {
	return `---\naccount: ${page.account}\n---\n\n${String(page.text ?? '').trim()}\n`;
}

export function zenePageParse(text, id) {
	const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(String(text ?? ''));
	const account = match ? (/^account:\s*([0-9a-z]+)\s*$/m.exec(match[1])?.[1] ?? '') : '';
	return { id, account, text: (match ? match[2] : String(text ?? '')).trim() };
}
