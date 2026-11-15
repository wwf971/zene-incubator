import { useEffect, useLayoutEffect, useMemo } from 'react';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { BlockPopupSurface, useCompStateStore } from '@wwf971/react-doc';
import { zeneBackendEnsure } from '../backend/ZeneBackendLocal.js';
import { zeneActionGet } from '../model/ZeneAction.js';
import { zeneEventVisibleIs } from '../model/ZeneRole.js';
import { ZeneAppStore } from './ZeneAppStore.js';
import { ZenePhone } from './ZenePhone.jsx';
import { ZeneSessionPanel } from './ZeneSessionPanel.jsx';

// The mode App of a music community (doc/zene-ui.md): the app on a simulated phone, and beside it the
// session: who holds the phone, and what each action changed in the data items. The phone reads one
// partition of the object (param.partition, the default one without), through a backend run in the
// page (ZeneBackendLocal).
//
//   param.partition   the community shown: a partition of the object
//   param.signIn      the handle of the person holding the phone at first (until someone signs in)
//   param.time        the moment the app starts at (20261115_12000000+09): the example keeps its meaning
//                     when the page is read later; absent, now
//   param.isSessionShown   false hides the session beside the phone
export const ZeneApp = observer(function ZeneApp({ data = {}, config = {} }) {
	const service = config.objectFrontend;
	const param = data.param ?? {};
	const partition = param.partition || service?.partitionDefault?.id || 'example';
	const keyBase = `zene:${service?.ref ?? ''}:${partition}`;
	const backend = zeneBackendEnsure({ storageKey: `${keyBase}:session`, partition, timeStart: param.time ?? '' });
	const store = useCompStateStore(config, `zene-app:${partition}`, () => new ZeneAppStore({ storageKey: `${keyBase}:device` }));
	useLayoutEffect(() => { backend.serviceSet(service); }, [backend, service]);
	const app = useMemo(() => zeneAppBuild(backend, store), [backend, store]);
	// someone holds the phone at first (param.signIn), until the device remembers who signed in
	useEffect(() => reaction(() => backend.baseRead.status, (status) => {
		if (status !== 'ready' || store.isDeviceSaved || store.device.personId || !param.signIn) return;
		const account = backend.world.accountByHandle(param.signIn);
		if (account?.subject.kind === 'individual') store.signIn(backend.world, account.subject.id);
	}, { fireImmediately: true }), [backend, store, param.signIn]);
	// the device follows the data: a person gone signs out, an account no longer managed is left
	useEffect(() => reaction(() => backend.world, (world) => store.deviceCheck(world, backend.timeNow()), { fireImmediately: true }), [backend, store]);
	const read = backend.baseRead;
	const title = service?.object?.name || 'Zene';
	return (
		<BlockPopupSurface config={config} title={title} className="zene-shell">
			{({ isInPopup }) => (
				<div className={`zene-app not-prose${isInPopup ? ' is-popup' : ''}`}>
					<div className="zene-app-phone">
						{read.status === 'loading' && read.countRead === 0 ? (
							<div className="zene-phone is-loading"><p className="doc-status">Reading the community ({read.countRead} of {read.countAll})</p></div>
						) : <ZenePhone app={app} />}
					</div>
					{param.isSessionShown === false ? null : <ZeneSessionPanel app={app} service={service} />}
				</div>
			)}
		</BlockPopupSurface>
	);
});

// what the screens are handed: the world, the moment, the actions, the ways to open things
function zeneAppBuild(backend, store) {
	const app = {
		backend,
		store,
		get world() { return backend.world; },
		get time() { return backend.timeNow(); },
		// an action for the person on the device; its outcome said by a toast
		actionRun(actionId, input = {}) {
			const answer = backend.actionRun(actionId, store.actor, input);
			if (answer.code === 0) store.toastShow(`Done: ${(zeneActionGet(actionId)?.label ?? actionId).toLowerCase()}`);
			else store.toastShow(answer.message, 'error');
			return answer;
		},
		push: (screen, param) => store.push(screen, param),
		accountOpen(accountId) {
			if (accountId === store.actor.accountId && store.tabId === 'me' && store.stack.length === 0) return;
			store.push('account', { id: accountId });
		},
		// a person, a group or an event: its account's homepage, or the event alone
		subjectOpen(kind, id) {
			const account = backend.world.accountOfSubject(kind, id);
			if (account) store.push('account', { id: account.id });
			else if (kind === 'event') store.push('event', { id });
		},
		eventOpen: (id) => app.subjectOpen('event', id),
		tagOpen: (id) => store.push('tag', { id }),
		isEventVisible: (event) => zeneEventVisibleIs(backend.world, store.actor.personId, event, backend.timeNow()),
		// the source path of a homepage, so its links resolve as in any document of the object
		pageDocPathGet: (pageId) => backend.service?.docPathGet(`/${backend.partition}/page/${pageId}`) ?? '',
	};
	return app;
}
