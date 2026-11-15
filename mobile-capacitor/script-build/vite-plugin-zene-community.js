import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

// The data the app shows, read from the doc page's folder when the app is built (and again in `vite`
// dev when a file of it changes): the block of the doc page that shows the app (doc/zene-demo.md, the
// ObjectFrontend block of mode `app`) names the frontend object and the param of the app; the object's
// folder (.doc-page/object-frontend/<id>--<name>/) gives its name, and the item list of the partition
// shown (item/<partition>/item-list.yaml) its data items, each with the content of its head version.
//
//   import community from 'virtual:zene-community'
//   community = { object: { ref, id, name, type }, partition, param, assetList: [{ key, kind, name,
//     partition, pathList, status, lang, data?, text? }] }
//
// Only the partition the app shows is read (example, tracked by git): the playground partition, which
// git ignores, never goes into the app. Design: doc-page/doc/zene-deploy-mobile-capacitor.md.

const MODULE_ID = 'virtual:zene-community';
const MODULE_ID_RESOLVED = `\0${MODULE_ID}`;

export function zeneCommunityPlugin({ docPage, demoDoc = 'doc/zene-demo.md' }) {
	const objectRoot = path.join(docPage, '.doc-page/object-frontend');
	return {
		name: 'zene-community',
		resolveId(id) {
			return id === MODULE_ID ? MODULE_ID_RESOLVED : null;
		},
		load(id) {
			if (id !== MODULE_ID_RESOLVED) return null;
			const community = zeneCommunityRead({ docPage, demoDoc, objectRoot });
			return `export default ${JSON.stringify(community)};`;
		},
		// in `vite` dev, a data item or the document changed: the module is read again, the app reloads
		configureServer(server) {
			server.watcher.add([objectRoot, path.join(docPage, demoDoc)]);
			const onChange = (file) => {
				if (!file.startsWith(objectRoot) && file !== path.join(docPage, demoDoc)) return;
				const module = server.moduleGraph.getModuleById(MODULE_ID_RESOLVED);
				if (!module) return;
				server.moduleGraph.invalidateModule(module);
				server.ws.send({ type: 'full-reload' });
			};
			server.watcher.on('change', onChange);
			server.watcher.on('add', onChange);
			server.watcher.on('unlink', onChange);
		},
	};
}

export function zeneCommunityRead({ docPage, demoDoc, objectRoot }) {
	const block = demoBlockRead(path.join(docPage, demoDoc));
	const objectId = String(block.object ?? '').replace(/^frontend:/, '');
	const objectDir = objectDirFind(objectRoot, objectId);
	const objectFile = YAML.parse(fs.readFileSync(path.join(objectDir, 'object.yaml'), 'utf8')) ?? {};
	const itemById = itemIndexBuild(path.join(objectDir, 'item'));
	const entry = itemContentRead(itemById.get(objectFile.entry));
	const param = block.param ?? {};
	const partition = param.partition || 'example';
	const partitionDir = path.join(objectDir, 'item', partition);
	if (!fs.existsSync(partitionDir)) throw new Error(`zene-community: the object ${objectId} has no partition ${partition} (${partitionDir})`);

	const assetList = [];
	for (const listFile of fileFind(partitionDir, (name) => name === 'item-list.yaml')) {
		const list = YAML.parse(fs.readFileSync(listFile, 'utf8')) ?? {};
		for (const one of list.assetList ?? []) {
			const item = itemById.get(one.itemId);
			const asset = { key: one.key, kind: one.kind, name: one.name ?? '', partition, pathList: one.pathList ?? [], status: 'found' };
			const content = itemContentRead(item);
			if (!content) { assetList.push({ ...asset, status: item?.isDeleted ? 'deleted' : 'missing' }); continue; }
			assetList.push({ ...asset, lang: content.lang, ...(content.data !== undefined ? { data: content.data } : { text: content.text }) });
		}
	}
	return {
		object: { ref: `frontend:${objectId}`, id: objectId, name: entry?.data?.name ?? '', type: entry?.data?.type ?? '' },
		partition,
		param,
		assetList,
	};
}

// the yaml of the first ObjectFrontend block of mode app in the document
function demoBlockRead(file) {
	const text = fs.readFileSync(file, 'utf8');
	const pattern = /<!--\s*renderComp=ObjectFrontend\s*-->\s*\n```ya?ml\n([\s\S]*?)\n```/g;
	for (const match of text.matchAll(pattern)) {
		const block = YAML.parse(match[1]) ?? {};
		if (block.mode === 'app') return block;
	}
	throw new Error(`zene-community: no ObjectFrontend block of mode app in ${file}`);
}

// the folder of an object: <id>--<name>, or <id>
function objectDirFind(root, objectId) {
	const name = fs.readdirSync(root).find((one) => one === objectId || one.startsWith(`${objectId}--`));
	if (!objectId || !name) throw new Error(`zene-community: no folder of the object ${objectId} in ${root}`);
	return path.join(root, name);
}

// every item folder below item/ (the one holding item.yaml), by item id
function itemIndexBuild(itemRoot) {
	const itemById = new Map();
	for (const file of fileFind(itemRoot, (name) => name === 'item.yaml')) {
		const meta = YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
		if (meta.itemId) itemById.set(meta.itemId, { ...meta, dir: path.dirname(file) });
	}
	return itemById;
}

// the content of the head version: data for yaml and json, the text otherwise
function itemContentRead(item) {
	if (!item || item.isDeleted || !item.versionIdHead) return null;
	const file = path.join(item.dir, `${item.versionIdHead}.${item.fileExt}`);
	if (!fs.existsSync(file)) return null;
	const text = fs.readFileSync(file, 'utf8');
	if (item.lang === 'yaml') return { lang: item.lang, data: YAML.parse(text) ?? {} };
	if (item.lang === 'json') return { lang: item.lang, data: JSON.parse(text) };
	return { lang: item.lang, text };
}

function fileFind(dir, isWanted, found = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) fileFind(full, isWanted, found);
		else if (isWanted(entry.name)) found.push(full);
	}
	return found;
}
