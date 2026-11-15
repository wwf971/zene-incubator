import { ZENE_KIND_ID_LIST, zeneEntityNormalize } from './ZeneKind.js';

// The world: every entity of one partition, read together, with the indexes the queries and
// the actions need (doc/zene-data.md#the-world). It is a value: built from a list of entities,
// never changed; a change is a new world built from the list with the change applied
// (ZeneBackendLocal). Nothing in it is a copy of the truth kept elsewhere: the items are.
//
//   entryList   [{ kind, data }]: the entities, data as written in their items
export function zeneWorldBuild(entryList) {
	const byKind = new Map(ZENE_KIND_ID_LIST.map((kind) => [kind, new Map()]));
	const problemList = [];
	for (const entry of entryList) {
		const map = byKind.get(entry.kind);
		if (!map) { problemList.push(`an item of an unknown kind ${entry.kind}`); continue; }
		const entity = zeneEntityNormalize(entry.kind, entry.data);
		if (!entity.id) { problemList.push(`an item of kind ${entry.kind} without an id`); continue; }
		if (map.has(entity.id)) { problemList.push(`${entry.kind} ${entity.id} is written twice: the first is kept`); continue; }
		map.set(entity.id, entity);
	}
	const get = (kind, id) => byKind.get(kind)?.get(id);
	const list = (kind) => [...(byKind.get(kind)?.values() ?? [])];
	const groupBy = (kind, keyOf) => {
		const index = new Map();
		for (const entity of list(kind)) {
			for (const key of [keyOf(entity)].flat()) {
				if (!key) continue;
				if (!index.has(key)) index.set(key, []);
				index.get(key).push(entity);
			}
		}
		return index;
	};
	const accountBySubject = new Map();
	const accountByHandle = new Map();
	for (const account of list('account')) {
		const key = `${account.subject.kind}:${account.subject.id}`;
		if (accountBySubject.has(key)) problemList.push(`two accounts speak for ${key}: ${accountBySubject.get(key).handle} is kept`);
		else accountBySubject.set(key, account);
		if (account.handle) {
			if (accountByHandle.has(account.handle)) problemList.push(`the handle @${account.handle} is taken twice`);
			else accountByHandle.set(account.handle, account);
		}
	}
	const tag = tagGraphBuild(list('tag'), problemList);
	const world = {
		byKind,
		problemList,
		get,
		list,
		count: (kind) => byKind.get(kind)?.size ?? 0,
		accountOfSubject: (kind, id) => accountBySubject.get(`${kind}:${id}`),
		accountByHandle: (handle) => accountByHandle.get(String(handle ?? '').replace(/^@/, '').toLowerCase()),
		membershipByGroup: groupBy('membership', (one) => one.group),
		membershipByIndividual: groupBy('membership', (one) => one.individual),
		subgroupByGroup: groupBy('subgroup', (one) => one.group),
		postByAccount: groupBy('post', (one) => one.account),
		followByFrom: groupBy('follow', (one) => one.from),
		followByTo: groupBy('follow', (one) => one.to),
		applicationByTarget: groupBy('application', (one) => `${one.target.kind}:${one.target.id}`),
		applicationByApplicant: groupBy('application', (one) => one.applicant),
		eventByPrincipal: groupBy('event', (one) => one.principalList.map((principal) => `${principal.kind}:${principal.id}`)),
		eventByParent: groupBy('event', (one) => one.parent),
		tag,
	};
	// what a person reads an entity as: its name, its handle, its label
	world.labelGet = (kind, id) => {
		const entity = get(kind, id);
		if (!entity) return '';
		if (kind === 'account') return entity.name || `@${entity.handle}`;
		if (kind === 'tag') return entity.label;
		if (kind === 'post') return entity.text.slice(0, 40);
		return entity.name ?? entity.id;
	};
	world.accountLabelGet = (accountId) => {
		const account = get('account', accountId);
		return account ? `@${account.handle}` : '';
	};
	return world;
}

// The tags as a graph (doc/zene-data.md#tags): a DAG whose edges are the parents of a tag, and
// for a work its composers and the work it comes from. A tag stands for itself and everything
// below it: looking for "strings" finds a violinist, looking for "Final Fantasy VII" finds an
// event playing One-Winged Angel. An edge closing a cycle is left out and reported.
function tagGraphBuild(tagList, problemList) {
	const byId = new Map(tagList.map((tag) => [tag.id, tag]));
	const upListById = new Map();
	const downListById = new Map(tagList.map((tag) => [tag.id, []]));
	const edgeOf = (tag) => [
		...tag.parentList.map((id) => ({ id, via: 'parent' })),
		...tag.composerList.map((id) => ({ id, via: 'composer' })),
		...tag.originList.map((id) => ({ id, via: 'origin' })),
	];
	// an edge is taken only when the tag it points to does not reach this one already
	const reach = (from, target, seen = new Set()) => {
		if (from === target) return true;
		if (seen.has(from)) return false;
		seen.add(from);
		return (upListById.get(from) ?? []).some((edge) => reach(edge.id, target, seen));
	};
	for (const tag of tagList) upListById.set(tag.id, []);
	for (const tag of tagList) {
		for (const edge of edgeOf(tag)) {
			if (!byId.has(edge.id)) { problemList.push(`the tag ${tag.label || tag.id} names a tag that is not there: ${edge.id}`); continue; }
			if (reach(edge.id, tag.id)) { problemList.push(`the tag ${tag.label || tag.id} would close a cycle through ${edge.id}: that edge is left out`); continue; }
			upListById.get(tag.id).push(edge);
			downListById.get(edge.id).push({ id: tag.id, via: edge.via });
		}
	}
	const closure = (startId, listById) => {
		const seen = new Set();
		const walk = (id) => {
			if (seen.has(id) || !byId.has(id)) return;
			seen.add(id);
			for (const edge of listById.get(id) ?? []) walk(edge.id);
		};
		walk(startId);
		return seen;
	};
	const edgeIsHierarchy = (edge) => edge.via !== 'composer';
	const cacheUp = new Map();
	const cacheDown = new Map();
	const graph = {
		byId,
		get: (id) => byId.get(id),
		upList: (id) => upListById.get(id) ?? [],
		downList: (id) => downListById.get(id) ?? [],
		// the tag and every tag above it
		ancestorSet: (id) => { if (!cacheUp.has(id)) cacheUp.set(id, closure(id, upListById)); return cacheUp.get(id); },
		// the tag and every tag below it
		descendantSet: (id) => { if (!cacheDown.has(id)) cacheDown.set(id, closure(id, downListById)); return cacheDown.get(id); },
		// the hierarchy a person browses: the parents, and for a work the work it comes from (a
		// composer is a link, not a folder)
		rootList: (kind) => tagList.filter((tag) => (!kind || tag.kindList.includes(kind)) && (upListById.get(tag.id) ?? []).filter(edgeIsHierarchy).length === 0),
		childList: (id) => (downListById.get(id) ?? []).filter(edgeIsHierarchy).map((edge) => byId.get(edge.id)).filter(Boolean),
		// the first chain of parents up to a root: violin < bowed strings < strings < instrument
		chainUp: (id) => {
			const chain = [];
			const seen = new Set();
			let one = byId.get(id);
			while (one && !seen.has(one.id)) {
				seen.add(one.id);
				chain.push(one);
				const up = (upListById.get(one.id) ?? []).find(edgeIsHierarchy);
				one = up ? byId.get(up.id) : undefined;
			}
			return chain;
		},
		// the icon a tag is drawn with: its own, else the nearest parent's
		iconOf: (id) => graph.chainUp(id).find((tag) => tag.icon)?.icon ?? '',
		colorOf: (id) => graph.chainUp(id).find((tag) => tag.color)?.color ?? '',
	};
	return graph;
}

// the tags an entity is found by (doc/zene-data.md#tags): what it plays, what it is about, what
// it looks for
export function zeneEntityTagIdList(world, kind, entity) {
	switch (kind) {
		case 'individual': return [...entity.skillList.map((one) => one.tag), ...entity.workTagList];
		case 'group': return [...entity.tagList, ...entity.recruitList.map((one) => one.tag)];
		case 'subgroup': return entity.tagList;
		case 'event': return [...entity.tagList, ...entity.programList.map((one) => one.tag), ...entity.openList.map((one) => one.tag)];
		case 'post': return [...entity.tagList, ...(entity.hiring?.tag ? [entity.hiring.tag] : [])];
		case 'account': {
			const subject = world.get(entity.subject.kind, entity.subject.id);
			return subject ? zeneEntityTagIdList(world, entity.subject.kind, subject) : [];
		}
		default: return [];
	}
}
