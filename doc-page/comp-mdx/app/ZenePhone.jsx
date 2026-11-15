import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { BatteryFull, Bell, CircleAlert, CircleCheck, Compass, House, Plus, Signal, Wifi } from 'lucide-react';
import { zeneInbox } from '../model/ZeneQuery.js';
import { ZENE_TAB_LIST, ZENE_TAB_PAGE_LIST } from './ZeneAppStore.js';
import { ZenePager, useZeneSwipe } from './ZeneSwipe.jsx';
import { ZeneAvatar } from './part/ZeneAvatar.jsx';
import { ZeneScreenActivity, ZeneScreenDiscover, ZeneScreenHome, ZeneScreenMe } from './screen/ZeneScreenTab.jsx';
import { ZeneScreenPushed } from './screen/ZeneScreenPushed.jsx';
import { ZeneAccountMenu, ZeneCreateMenu, ZeneSheetHost } from './sheet/ZeneSheet.jsx';

// The simulated phone (doc/zene-ui.md#the-phone): the frame and its status bar, the screens of the
// four page tabs side by side (a swipe goes from one to the next), each tab with its own stack of
// pushed screens (a swipe to the right goes back), the bar of five buttons at the bottom, and the
// sheets sliding up over everything. Nothing here knows the data: the screens read the world.

const ROOT_BY_TAB = { home: ZeneScreenHome, discover: ZeneScreenDiscover, activity: ZeneScreenActivity, me: ZeneScreenMe };

export const ZenePhone = observer(function ZenePhone({ app }) {
	const screenRef = useRef(null);
	const { store } = app;
	const pageIndex = Math.max(0, ZENE_TAB_PAGE_LIST.indexOf(store.tabId));
	useWheelKept(screenRef);
	return (
		<div className="zene-phone" data-zene-phone="">
			<div className="zene-phone-island" />
			<div ref={screenRef} className="zene-phone-screen">
				<ZeneStatusBar />
				<div className="zene-phone-body">
					<ZenePager
						className="is-tab"
						index={pageIndex}
						onIndexChange={(index) => store.tabSet(ZENE_TAB_PAGE_LIST[index])}
						isSwipeEnabled={store.stack.length === 0}
						pageList={ZENE_TAB_PAGE_LIST.map((tabId) => ({ id: tabId, render: () => <ZeneTabStack app={app} tabId={tabId} /> }))}
					/>
				</div>
				<ZeneTabBar app={app} />
				<ZeneCreateMenu app={app} />
				<ZeneAccountMenu app={app} />
				<ZeneSheetHost app={app} />
				<ZeneToast app={app} />
				<div className="zene-phone-home-bar" />
			</div>
		</div>
	);
});

function ZeneStatusBar() {
	return (
		<div className="zene-status-bar" aria-hidden="true">
			<span className="zene-status-name">zene</span>
			<span className="zene-status-icon"><Signal size={13} /><Wifi size={13} /><BatteryFull size={16} /></span>
		</div>
	);
}

// a tab: its root screen, and the screens pushed over it
const ZeneTabStack = observer(function ZeneTabStack({ app, tabId }) {
	const stack = app.store.stackByTab[tabId] ?? [];
	const leaving = app.store.screenLeaving?.tabId === tabId ? app.store.screenLeaving : null;
	const Root = ROOT_BY_TAB[tabId];
	return (
		<div className="zene-stack">
			<div className={`zene-stack-screen is-root${stack.length > 0 ? ' is-covered' : ''}`}><Root app={app} /></div>
			{stack.map((entry, index) => <ZeneStackScreen key={entry.seq} app={app} entry={entry} isTop={index === stack.length - 1} />)}
			{leaving ? (
				<div key={leaving.seq} className="zene-stack-screen is-leaving" onAnimationEnd={() => app.store.popDone()}>
					<ZeneScreenPushed app={app} screen={leaving.screen} param={leaving.param} />
				</div>
			) : null}
		</div>
	);
});

// a pushed screen: it slides in; the top one follows a finger moving right and goes back past a third
const ZeneStackScreen = observer(function ZeneStackScreen({ app, entry, isTop }) {
	const ref = useRef(null);
	const offsetSet = (dx, isAnimated) => {
		const element = ref.current;
		if (!element) return;
		element.style.transition = isAnimated ? 'transform 0.22s ease-out' : 'none';
		element.style.transform = dx > 0 ? `translateX(${dx}px)` : '';
	};
	useZeneSwipe(ref, {
		canTake: (direction) => isTop && direction === 'right',
		onDrag: (dx) => offsetSet(Math.max(0, dx), false),
		onEnd: (dx, velocity) => {
			const width = ref.current?.clientWidth || 1;
			if (dx > width * 0.33 || velocity > 0.5) {
				offsetSet(width, true);
				setTimeout(() => app.store.pop({ isDragged: true }), 200);
			} else offsetSet(0, true);
		},
	});
	return (
		<div ref={ref} className={`zene-stack-screen is-pushed${isTop ? '' : ' is-covered'}`}>
			<ZeneScreenPushed app={app} screen={entry.screen} param={entry.param} />
		</div>
	);
});

const TAB_ICON = { home: House, discover: Compass, activity: Bell };

const ZeneTabBar = observer(function ZeneTabBar({ app }) {
	const { store } = app;
	const inbox = zeneInbox(app.world, { personId: store.actor.personId, time: app.time });
	const account = app.world.get('account', store.actor.accountId);
	return (
		<nav className="zene-tab-bar" aria-label="Tabs">
			{ZENE_TAB_LIST.map((tab) => {
				if (tab.isAction) {
					return (
						<button key={tab.id} type="button" className="zene-tab is-create" aria-label="Create" aria-expanded={store.menu === 'create'} onClick={() => store.menuSet('create')}>
							<span className="zene-tab-create"><Plus size={22} strokeWidth={2.6} /></span>
						</button>
					);
				}
				const Icon = TAB_ICON[tab.id];
				const isOn = store.tabId === tab.id;
				return (
					<button key={tab.id} type="button" className={`zene-tab${isOn ? ' is-on' : ''}`} aria-pressed={isOn} onClick={() => store.tabSet(tab.id)}>
						{tab.id === 'me' ? <ZeneAvatar account={account} size={24} isRing={isOn} /> : <Icon size={22} strokeWidth={isOn ? 2.4 : 1.8} />}
						{tab.id === 'activity' && inbox.count > 0 ? <span className="zene-tab-badge">{inbox.count}</span> : null}
						<span className="zene-tab-label">{tab.label}</span>
					</button>
				);
			})}
		</nav>
	);
});

const ZeneToast = observer(function ZeneToast({ app }) {
	const toast = app.store.toast;
	useEffect(() => {
		if (!toast) return undefined;
		const timer = setTimeout(() => app.store.toastClear(toast.seq), toast.tone === 'error' ? 3600 : 2200);
		return () => clearTimeout(timer);
	}, [toast, app.store]);
	if (!toast) return null;
	return (
		<div key={toast.seq} className={`zene-toast is-${toast.tone}`} role="status">
			{toast.tone === 'error' ? <CircleAlert size={15} /> : <CircleCheck size={15} />}
			<span>{toast.text}</span>
		</div>
	);
});

// the wheel inside the phone never scrolls the page: it scrolls the screen under it, and where
// that screen cannot scroll any further it is stopped (doc/zene-ui.md#gestures)
function useWheelKept(ref) {
	useEffect(() => {
		const element = ref.current;
		if (!element) return undefined;
		const onWheel = (event) => {
			if (event.defaultPrevented || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
			let node = event.target;
			while (node && node !== element) {
				if (node.dataset?.zeneScroll !== undefined || node.tagName === 'TEXTAREA') {
					const isDown = event.deltaY > 0;
					const room = isDown ? node.scrollHeight - node.clientHeight - node.scrollTop : node.scrollTop;
					if (room > 0.5) return;
				}
				node = node.parentElement;
			}
			event.preventDefault();
		};
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => element.removeEventListener('wheel', onWheel);
	}, [ref]);
}
