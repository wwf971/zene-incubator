#!/usr/bin/env node
// Writes the made-up community of zene-example.yaml into a partition of a frontend object of the type
// zene.community, through a running development server (react-doc dev <this package>): one data item
// per entity, at /{partition}/{kind}/{id}. Run again, it updates what changed and leaves the rest.
//
//   node script-data/zene-seed.mjs --server http://localhost:45200 [--partition example] [--object <id>] [--dry]
//
// A local name ($mika) becomes an id made from the name, so a run again finds the same entities.
// The yaml library is read from the react-doc checkout (REACT_DOC_DIR, default: beside this repository).
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirHere = path.dirname(fileURLToPath(import.meta.url));
const reactDocDir = process.env.REACT_DOC_DIR ?? path.resolve(dirHere, '../../../react-doc');
const YAML = createRequire(path.join(reactDocDir, 'main/frontend/'))('yaml');
const { zeneEventAccountExpireOf } = await import('../comp-mdx/model/ZeneRole.js');
const { zeneEntityCompact } = await import('../comp-mdx/model/ZeneAction.js');
const { zeneEntityNameGet, zeneEntityPathBuild, zenePageTextBuild } = await import('../comp-mdx/model/ZeneKind.js');
const { zeneTimeText, zeneTimeZoneOf } = await import('../comp-mdx/model/ZeneTime.js');
const { zeneWorldBuild } = await import('../comp-mdx/model/ZeneWorld.js');

const argList = process.argv.slice(2);
const argGet = (name, fallback = '') => { const index = argList.indexOf(`--${name}`); return index < 0 ? fallback : argList[index + 1] ?? ''; };
const server = argGet('server').replace(/\/+$/, '');
const partition = argGet('partition', 'example');
const isDry = argList.includes('--dry');
if (!server) { console.error('usage: zene-seed.mjs --server <url> [--partition example] [--object <id>] [--dry]'); process.exit(2); }
const TYPE_ID = 'zene.community';
const TIME_DEFAULT = '20261101_10000000+09';

// --- the entities of the source ---------------------------------------------------------------

const source = YAML.parse(fs.readFileSync(path.join(dirHere, 'zene-example.yaml'), 'utf8'));
const idOf = (local) => {
	const hex = crypto.createHash('sha1').update(`zene-example:${local}`).digest('hex').slice(0, 14);
	return BigInt(`0x${hex}`).toString(36).padStart(11, '0');
};
const entryList = [];
const localSet = new Set();
let countAuto = 0;
const localOf = (raw, kind) => {
	const local = raw?.$ ? String(raw.$) : `${kind}-${++countAuto}`;
	if (localSet.has(local)) throw new Error(`the local name $${local} is written twice`);
	localSet.add(local);
	return local;
};
const push = (kind, local, data) => entryList.push({ kind, local, data: { ...data, id: idOf(local), timeCreated: data.timeCreated ?? TIME_DEFAULT } });

// an account (and its homepage) of an individual, a group or an event, written inside it
function accountPush(subjectKind, subjectLocal, raw, extra = {}) {
	if (!raw.account) return '';
	const { homepage, ...account } = raw.account;
	const accountLocal = account.handle;
	localOf({ $: accountLocal }, 'account');
	const pageLocal = homepage ? `page-${account.handle}` : '';
	if (pageLocal) {
		localOf({ $: pageLocal }, 'page');
		push('page', pageLocal, { account: `$${accountLocal}`, text: homepage.trim(), timeCreated: raw.timeCreated });
	}
	push('account', accountLocal, {
		handle: account.handle, name: raw.name, subject: { kind: subjectKind, id: `$${subjectLocal}` }, bio: account.bio ?? '', avatar: account.avatar ?? {},
		homepage: pageLocal ? `$${pageLocal}` : '', viewList: subjectKind === 'event' ? ['about', 'post'] : ['about', 'post', 'event', 'group'],
		timeCreated: raw.timeCreated, ...extra,
	});
	return `$${accountLocal}`;
}

// every tag in one item: the taxonomy of the community; each tag keeps an id of its own
const tagList = (source.tag ?? []).map((raw) => {
	const { $: _local, ...data } = raw;
	return { ...data, id: idOf(localOf(raw, 'tag')), timeCreated: data.timeCreated ?? TIME_DEFAULT };
});
push('taxonomy', localOf({ $: 'taxonomy' }, 'taxonomy'), { name: 'Tags of the community', tagList });
for (const kind of ['individual', 'group', 'event']) {
	for (const raw of source[kind] ?? []) {
		const local = localOf(raw, kind);
		const { $: _local, account: _account, availability, ...data } = raw;
		// when the person or the group can play: an item of its own, each declaration with an id
		if (availability) {
			const availabilityLocal = localOf({ $: `availability-${local}` }, 'availability');
			const timeDeclared = raw.timeCreated ?? TIME_DEFAULT;
			push('availability', availabilityLocal, {
				subject: { kind, id: `$${local}` }, zone: availability.zone ?? '+09',
				...(availability.current ? { current: { timeDeclared, ...availability.current } } : {}),
				declarationList: (availability.declarationList ?? []).map((one, index) => ({ id: idOf(`${availabilityLocal}:${index}`), timeDeclared, ...one })),
				timeCreated: raw.timeCreated,
			});
		}
		let extra = {};
		if (kind === 'event') {
			const expire = zeneEventAccountExpireOf({ timeStart: data.timeStart, timeEnd: data.timeEnd });
			extra = { isTemporary: true, timeExpire: zeneTimeText(expire, zeneTimeZoneOf(data.timeStart)) };
		}
		const account = accountPush(kind, local, raw, extra);
		push(kind, local, { ...data, ...(account ? { account } : {}) });
	}
}
for (const kind of ['membership', 'subgroup', 'post', 'application', 'follow']) {
	for (const raw of source[kind] ?? []) {
		const { $: _local, ...data } = raw;
		push(kind, localOf(raw, kind), data);
	}
}

// every $name written in a value becomes the id of that name
const resolve = (value, where) => {
	if (typeof value === 'string' && /^\$[A-Za-z0-9._-]+$/.test(value)) {
		const local = value.slice(1);
		if (!localSet.has(local)) throw new Error(`${where}: no entity is named $${local}`);
		return idOf(local);
	}
	if (Array.isArray(value)) return value.map((one) => resolve(one, where));
	if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, one]) => [key, resolve(one, where)]));
	return value;
};
for (const entry of entryList) entry.data = zeneEntityCompact(resolve(entry.data, `${entry.kind} $${entry.local}`));
const world = zeneWorldBuild(entryList);
if (world.problemList.length > 0) console.warn(`the community has problems:\n  ${world.problemList.join('\n  ')}`);
const textOf = (entry) => (entry.kind === 'page' ? zenePageTextBuild(entry.data) : YAML.stringify(entry.data));

// --- writing through the server -----------------------------------------------------------------

async function api(route, body) {
	const response = await fetch(`${server}/__doc-asset${route}`, body === undefined ? undefined : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
	const answer = await response.json();
	if (answer.code !== 0) throw new Error(`${route}: ${answer.message}`);
	return answer.data;
}

const countByKind = Object.fromEntries([...new Set(entryList.map((one) => one.kind))].map((kind) => [kind, entryList.filter((one) => one.kind === kind).length]));
console.log(`${entryList.length} entities: ${Object.entries(countByKind).map(([kind, count]) => `${count} ${kind}`).join(', ')}`);
if (isDry) process.exit(0);

let config = await api('/object-frontend/config');
const docPage = config.docPageList[0];
if (!docPage) throw new Error('the server has no doc page that can hold frontend objects');
let object = docPage.objectList.find((one) => (argGet('object') ? one.id === argGet('object') : one.typeId === TYPE_ID));
if (!object) {
	await api('/object-frontend/create', { docPageAlias: docPage.alias, typeId: TYPE_ID, name: 'Zene example community', description: 'the made-up music community of the demonstration' });
	config = await api('/object-frontend/config');
	object = config.docPageList.find((one) => one.alias === docPage.alias).objectList.at(-1);
	console.log(`created the object frontend:${object.id}`);
}
const assetByPath = new Map();
for (const list of object.listList ?? []) for (const asset of list.assetList ?? []) for (const one of asset.pathList ?? []) assetByPath.set(one, asset);
const itemById = new Map((await api('/item/list?store=local')).itemList.map((item) => [item.itemId, item]));
const hashOf = (text) => crypto.createHash('sha1').update(text).digest('hex');
const count = { created: 0, updated: 0, same: 0, failed: 0 };
for (const entry of entryList) {
	const assetPath = zeneEntityPathBuild(partition, entry.kind, entry.data.id);
	const text = textOf(entry);
	const name = zeneEntityNameGet(world, entry.kind, world.get(entry.kind, entry.data.id) ?? entry.data);
	const asset = assetByPath.get(assetPath);
	try {
		if (!asset) {
			await api('/object-frontend/asset/create', { id: object.id, kind: entry.kind, name, pathList: [assetPath], lang: entry.kind === 'page' ? 'md' : 'yaml', text, partition, note: 'seeded from script-data/zene-example.yaml' });
			count.created += 1;
			continue;
		}
		const item = itemById.get(asset.itemId);
		const head = item?.versionList?.find((version) => version.versionId === item.versionIdHead);
		if (head?.hash === hashOf(text) && asset.name === name) { count.same += 1; continue; }
		if (head?.hash !== hashOf(text)) await api('/item/update', { store: 'local', itemId: asset.itemId, hashBase: head?.hash, text, mode: 'inPlace', note: 'seeded from script-data/zene-example.yaml' });
		if (asset.name !== name) await api('/object-frontend/asset/meta/set', { id: object.id, key: asset.key, name });
		count.updated += 1;
	} catch (error) {
		count.failed += 1;
		console.warn(`${entry.kind} $${entry.local}: ${error.message}`);
	}
}
console.log(`frontend:${object.id}, partition ${partition}: ${count.created} created, ${count.updated} updated, ${count.same} unchanged, ${count.failed} failed`);
