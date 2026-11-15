import { action, makeObservable, observable } from 'mobx';
import { zeneAccountManageIs } from '../model/ZeneRole.js';

// The state of the app on the simulated phone (doc/zene-ui.md#the-state-of-the-app): who is signed in
// on the device, the tab shown, the screens pushed on each tab, the sheet open, what is searched, the
// drafts of the forms. The data is the backend's (ZeneBackendLocal); this is only where the person is.
// Kept for the block (useCompStateStore), so it survives the popup and the edit mode; who is signed in
// is also kept in this browser, beside the session.

export const ZENE_TAB_LIST = [
	{ id: 'home', label: 'Home' },
	{ id: 'discover', label: 'Discover' },
	{ id: 'create', label: 'Create', isAction: true },
	{ id: 'activity', label: 'Activity' },
	{ id: 'me', label: 'Me' },
];
// the tabs that are pages, in the order a swipe goes through them
export const ZENE_TAB_PAGE_LIST = ZENE_TAB_LIST.filter((one) => !one.isAction).map((one) => one.id);

let seqLast = 0;
const seqNext = () => ++seqLast;

export class ZeneAppStore {
	device = { personId: '', accountId: '' };
	tabId = 'home';
	stackByTab = { home: [], discover: [], activity: [], me: [] };
	// a pushed screen leaving (its slide out), and whether the top one is being dragged back
	screenLeaving = null;
	sheet = null;
	menu = '';
	toast = null;
	search = { text: '', tagIdList: [], kind: '' };
	activitySegment = 'decide';
	viewByAccount = {};
	draftByKey = {};
	logSeqFocused = 0;
	storageKey = '';

	constructor({ storageKey }) {
		makeObservable(this, {
			device: observable,
			tabId: observable,
			stackByTab: observable,
			screenLeaving: observable.ref,
			sheet: observable.ref,
			menu: observable,
			toast: observable.ref,
			search: observable,
			activitySegment: observable,
			viewByAccount: observable,
			draftByKey: observable,
			logSeqFocused: observable,
			signIn: action,
			signOut: action,
			actAs: action,
			deviceCheck: action,
			tabSet: action,
			push: action,
			pop: action,
			popDone: action,
			popToRoot: action,
			sheetOpen: action,
			sheetClose: action,
			menuSet: action,
			toastShow: action,
			toastClear: action,
			searchSet: action,
			searchTagToggle: action,
			activitySegmentSet: action,
			viewSet: action,
			draftSet: action,
			draftClear: action,
			logFocus: action,
		});
		this.storageKey = storageKey;
		this.deviceRead();
	}

	get actor() {
		return { personId: this.device.personId, accountId: this.device.accountId };
	}

	get stack() {
		return this.stackByTab[this.tabId] ?? [];
	}

	// --- signing in on the device ---------------------------------------------------------------
	// the demonstration has no password: signing in is choosing who holds the phone. a backend
	// would put a session of the auth layer here (doc/zene-ui.md#signing-in)
	signIn(world, personId) {
		const account = world.accountOfSubject('individual', personId);
		this.device = { personId, accountId: account?.id ?? '' };
		this.menu = '';
		this.deviceSave();
	}

	signOut() {
		this.device = { personId: '', accountId: '' };
		this.menu = '';
		for (const tab of Object.keys(this.stackByTab)) this.stackByTab[tab] = [];
		this.deviceSave();
	}

	// act as another account the person may act as (a group, an event they organize)
	actAs(accountId) {
		this.device = { ...this.device, accountId };
		this.menu = '';
		this.deviceSave();
	}

	// the device as the data allows it now: a person gone signs out, an account no longer
	// managed falls back to the person's own
	deviceCheck(world, time) {
		const { personId, accountId } = this.device;
		if (!personId) return;
		if (!world.get('individual', personId)) { this.signOut(); return; }
		if (!zeneAccountManageIs(world, personId, accountId, time)) {
			this.device = { personId, accountId: world.accountOfSubject('individual', personId)?.id ?? '' };
			this.deviceSave();
		}
	}

	// --- where the person is --------------------------------------------------------------------
	tabSet(tabId) {
		if (this.tabId === tabId) { this.popToRoot(); return; }
		this.tabId = tabId;
		this.menu = '';
	}

	// a screen pushed on the current tab: { screen: account | event | post | tag | subgroup, param }
	push(screen, param = {}) {
		const top = this.stack.at(-1);
		if (top && top.screen === screen && JSON.stringify(top.param) === JSON.stringify(param)) return;
		this.stackByTab[this.tabId] = [...this.stack, { seq: seqNext(), screen, param }];
		this.menu = '';
	}

	// the top screen taken off: it slides out unless it was dragged out already
	pop({ isDragged = false } = {}) {
		const stack = this.stack;
		if (stack.length === 0) return;
		const top = stack.at(-1);
		this.stackByTab[this.tabId] = stack.slice(0, -1);
		this.screenLeaving = isDragged ? null : { ...top, tabId: this.tabId };
	}

	popDone() {
		this.screenLeaving = null;
	}

	popToRoot() {
		this.stackByTab[this.tabId] = [];
		this.screenLeaving = null;
	}

	// a sheet over the screens: a form, a list to choose from ({ kind, param })
	sheetOpen(kind, param = {}) {
		this.sheet = { seq: seqNext(), kind, param };
		this.menu = '';
	}

	sheetClose() {
		this.sheet = null;
	}

	menuSet(menu) {
		this.menu = this.menu === menu ? '' : menu;
	}

	toastShow(text, tone = 'done') {
		this.toast = { seq: seqNext(), text, tone };
	}

	toastClear(seq) {
		if (this.toast?.seq === seq) this.toast = null;
	}

	searchSet(change) {
		Object.assign(this.search, change);
	}

	searchTagToggle(tagId) {
		const list = this.search.tagIdList;
		this.search.tagIdList = list.includes(tagId) ? list.filter((one) => one !== tagId) : [...list, tagId];
	}

	activitySegmentSet(segment) {
		this.activitySegment = segment;
	}

	viewGet(accountId, viewList) {
		const view = this.viewByAccount[accountId];
		return viewList.includes(view) ? view : viewList[0];
	}

	viewSet(accountId, view) {
		this.viewByAccount[accountId] = view;
	}

	// the draft of a form, kept while the sheet is closed and opened again
	draftGet(key, initial = {}) {
		if (!this.draftByKey[key]) this.draftByKey[key] = initial;
		return this.draftByKey[key];
	}

	draftSet(key, change) {
		Object.assign(this.draftGet(key), change);
	}

	draftClear(key) {
		delete this.draftByKey[key];
	}

	logFocus(seq) {
		this.logSeqFocused = this.logSeqFocused === seq ? 0 : seq;
	}

	deviceRead() {
		try {
			const saved = JSON.parse(globalThis.localStorage?.getItem(this.storageKey) ?? 'null');
			if (saved?.version === 1 && typeof saved.device?.personId === 'string') this.device = { personId: saved.device.personId, accountId: String(saved.device.accountId ?? '') };
			if (saved?.version === 1) this.isDeviceSaved = true;
		} catch {
			// nothing kept: nobody is signed in
		}
	}

	deviceSave() {
		try {
			globalThis.localStorage?.setItem(this.storageKey, JSON.stringify({ version: 1, device: this.device }));
		} catch {
			// a browser keeping nothing: the sign-in lasts while the page is open
		}
	}
}
