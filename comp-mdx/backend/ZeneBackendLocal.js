import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import { zeneActionGet, zeneActionReasonGet, zeneActionRun, zeneEffectListApply } from '../model/ZeneAction.js';
import { zeneIdNew } from '../model/ZeneId.js';
import { ZENE_KIND_ID_LIST, zeneEntityNameGet, zeneEntityPathBuild, zeneEntityPathParse, zeneKindGet, zenePageParse, zenePageTextBuild } from '../model/ZeneKind.js';
import { zeneTimeMs, zeneTimeNow, zeneTimeText, zeneTimeZoneOf } from '../model/ZeneTime.js';
import { zeneWorldBuild } from '../model/ZeneWorld.js';

// The backend of the demonstration (doc/zene-ui.md#the-backend-of-the-demonstration): the actions
// run in the page, over the data items of one partition of the object.
//
//   the partition    the items of the frontend object, read through the api of its mode: what the
//                    files (or a storage point) hold. never written while a document is read
//   the session      the effects of the actions run since, kept in this browser: the world the app
//                    shows is the partition with the session applied over it
//   writing          in edit mode, the session is written into the partition (each entity created,
//                    updated or removed as one asset item) and starts empty again
//
// An MVP replaces this class by one asking a server: actionRun sends { actionId, input } and the
// server runs the same catalog (model/ZeneAction.js) against its storage. The screens see no
// difference: they read `world` and call `actionRun`.
export class ZeneBackendLocal {
	service = undefined;
	partition = '';
	storageKey = '';
	changeList = [];
	logList = [];
	write = { isRunning: false, countDone: 0, countAll: 0, message: '' };
	clock = { timeStart: '', msAtStart: 0 };

	constructor({ partition, storageKey, timeStart = '' }) {
		makeObservable(this, {
			service: observable.ref,
			partition: observable,
			changeList: observable.shallow,
			logList: observable.shallow,
			write: observable,
			baseRead: computed,
			world: computed,
			changeCount: computed,
			serviceSet: action,
			actionRun: action,
			discard: action,
			partitionWrite: action,
		});
		this.partition = partition;
		this.storageKey = storageKey;
		this.clock = { timeStart, msAtStart: Date.now() };
		this.sessionRead();
	}

	serviceSet(service) {
		if (this.service !== service) this.service = service;
	}

	// now, as the app tells it: the time the block starts at (param.time) and the time since,
	// so the example keeps its meaning when the page is read later; without it, the real now
	timeNow() {
		const { timeStart, msAtStart } = this.clock;
		if (!timeStart || !Number.isFinite(zeneTimeMs(timeStart))) return zeneTimeNow();
		return zeneTimeText(zeneTimeMs(timeStart) + (Date.now() - msAtStart), zeneTimeZoneOf(timeStart));
	}

	// the entities of the partition: each asset of a kind of the community lying in it, with its
	// data read through the mode's api (loaded together, a few at a time)
	get baseRead() {
		const service = this.service;
		if (!service) return { status: 'loading', countRead: 0, countAll: 0, entryList: [], problemList: [] };
		const assetList = service.assetList().filter((asset) => asset.partition === this.partition && ZENE_KIND_ID_LIST.includes(asset.kind));
		const entryList = [];
		const problemList = [];
		let countRead = 0;
		for (const asset of assetList) {
			if (asset.status !== 'found') { problemList.push(`${asset.kind} ${asset.name || asset.key}: ${asset.status}`); continue; }
			const place = (asset.pathList ?? []).map(zeneEntityPathParse).find(Boolean);
			if (asset.kind === 'page') {
				const read = service.assetTextGet(asset.key);
				if (read.status === 'loading') continue;
				countRead += 1;
				if (read.status === 'error') { problemList.push(`${asset.key}: ${read.message}`); continue; }
				entryList.push({ kind: 'page', data: zenePageParse(read.text, place?.id ?? asset.key), asset });
				continue;
			}
			const read = service.assetDataGet(asset.key);
			if (read.status === 'loading') continue;
			countRead += 1;
			if (read.status === 'error') { problemList.push(`${asset.key}: ${read.message}`); continue; }
			const data = read.data ?? {};
			if (place && data.id && place.id !== data.id) problemList.push(`${asset.kind} ${data.id} lies at the path of ${place.id}`);
			entryList.push({ kind: asset.kind, data: { ...data, id: data.id || place?.id || '' }, asset });
		}
		const isRead = countRead === assetList.filter((one) => one.status === 'found').length;
		return { status: isRead ? 'ready' : 'loading', countRead, countAll: assetList.length, entryList, problemList };
	}

	// the world the app shows: the partition with the session over it
	get world() {
		const entryByKey = new Map(this.baseRead.entryList.map((entry) => [`${entry.kind}:${entry.data.id}`, entry]));
		zeneEffectListApply(entryByKey, this.changeList);
		const world = zeneWorldBuild([...entryByKey.values()]);
		world.problemList.push(...this.baseRead.problemList);
		return world;
	}

	get changeCount() {
		return this.changeList.length;
	}

	// '' when the actor may do the action (and, with isInputChecked, what is asked fits), else why not
	actionReasonGet(actionId, actor, input = {}, { isInputChecked = false } = {}) {
		return zeneActionReasonGet(this.world, { actionId, actor, input, time: this.timeNow(), isInputChecked });
	}

	// an action run: its effects applied to the session, and told in the log
	// { code, message, data: { effectList, result } }
	actionRun(actionId, actor, input = {}) {
		const time = this.timeNow();
		const worldBefore = this.world;
		const answer = zeneActionRun(worldBefore, { actionId, actor, input, time, idNew: () => zeneIdNew() });
		const accountActing = worldBefore.get('account', actor?.accountId ?? '');
		this.logList.unshift({
			seq: (this.logList[0]?.seq ?? 0) + 1,
			actionId,
			label: zeneActionGet(actionId)?.label ?? actionId,
			actorText: accountActing ? `@${accountActing.handle}` : 'a visitor',
			code: answer.code,
			message: answer.message,
			effectList: (answer.data?.effectList ?? []).map((effect) => ({
				op: effect.op, kind: effect.kind, id: effect.id, fieldList: effect.fieldList ?? [],
				label: effect.data ? zeneEntityNameGet(worldBefore, effect.kind, effect.data) : worldBefore.labelGet(effect.kind, effect.id),
			})),
			time,
		});
		if (this.logList.length > 60) this.logList.length = 60;
		if (answer.code === 0) this.changeList.push(...answer.data.effectList.map((effect) => ({ ...effect, actionId, time })));
		this.sessionSave();
		return answer;
	}

	discard() {
		this.changeList.replace([]);
		this.logList.replace([]);
		this.sessionSave();
	}

	// what writing the session would do to the partition: per entity, its last state against the
	// partition's (created, updated, removed)
	writePlanGet() {
		const baseByKey = new Map(this.baseRead.entryList.map((entry) => [`${entry.kind}:${entry.data.id}`, entry]));
		const finalByKey = new Map();
		for (const change of this.changeList) finalByKey.set(`${change.kind}:${change.id}`, change);
		const planList = [];
		for (const [key, change] of finalByKey) {
			const base = baseByKey.get(key);
			if (change.op === 'delete') { if (base) planList.push({ op: 'remove', kind: change.kind, id: change.id, asset: base.asset }); continue; }
			planList.push(base ? { op: 'write', kind: change.kind, id: change.id, data: change.data, asset: base.asset } : { op: 'create', kind: change.kind, id: change.id, data: change.data });
		}
		return planList;
	}

	// the session written into the partition, one asset item per entity; refused unless the mode
	// may edit (the document in edit mode) and the partition can be written
	async partitionWrite() {
		const service = this.service;
		const reason = !service ? 'the object is not read yet' : !service.isEditable ? service.editUnavailableReason : service.partitionWriteUnavailableReasonGet(this.partition);
		if (reason) return { code: -1, message: reason };
		const planList = this.writePlanGet();
		this.write = { isRunning: true, countDone: 0, countAll: planList.length, message: '' };
		const world = this.world;
		for (const plan of planList) {
			const path = zeneEntityPathBuild(this.partition, plan.kind, plan.id);
			const isPage = plan.kind === 'page';
			let answer;
			if (plan.op === 'create') {
				answer = await service.assetCreate({
					kind: plan.kind, name: zeneEntityNameGet(world, plan.kind, plan.data), pathList: [path], partition: this.partition, lang: zeneKindGet(plan.kind).lang,
					...(isPage ? { text: zenePageTextBuild(plan.data) } : { data: plan.data }), note: 'written from the session of the app',
				});
			} else if (plan.op === 'write') {
				answer = await service.assetWrite(plan.asset.key, isPage ? zenePageTextBuild(plan.data) : plan.data, 'written from the session of the app');
			} else {
				answer = await service.assetRemove(plan.asset.key);
			}
			if (answer?.code !== 0) {
				runInAction(() => { this.write = { ...this.write, isRunning: false, message: `${plan.op} ${plan.kind} ${plan.id}: ${answer?.message ?? 'refused'}` }; });
				return { code: -1, message: this.write.message };
			}
			runInAction(() => { this.write.countDone += 1; });
		}
		runInAction(() => {
			this.changeList.replace([]);
			this.write = { isRunning: false, countDone: planList.length, countAll: planList.length, message: `${planList.length} data item(s) written into the partition ${this.partition}` };
		});
		this.sessionSave();
		return { code: 0, message: this.write.message };
	}

	// the session survives a reload: kept in this browser, for this object and partition. it is the
	// device's own, never shared, and a missing or broken copy is an empty session
	sessionRead() {
		try {
			const text = globalThis.localStorage?.getItem(this.storageKey);
			const saved = text ? JSON.parse(text) : undefined;
			if (saved?.version !== 1) return;
			this.changeList = Array.isArray(saved.changeList) ? saved.changeList : [];
			this.logList = Array.isArray(saved.logList) ? saved.logList.slice(0, 60) : [];
		} catch {
			// a browser keeping nothing: the session starts empty
		}
	}

	sessionSave() {
		try {
			globalThis.localStorage?.setItem(this.storageKey, JSON.stringify({ version: 1, changeList: this.changeList, logList: this.logList }));
		} catch {
			// a browser keeping nothing: the session lasts while the page is open
		}
	}
}

// one backend per object and partition on the page: every block showing it (the app, the data
// items) shares its session
const backendByKey = new Map();
export function zeneBackendEnsure({ storageKey, partition, timeStart }) {
	if (!backendByKey.has(storageKey)) backendByKey.set(storageKey, new ZeneBackendLocal({ partition, storageKey, timeStart }));
	return backendByKey.get(storageKey);
}
