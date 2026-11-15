import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import community from 'virtual:zene-community';
import { ZeneApp } from '@doc-page/comp-mdx/app/ZeneApp.jsx';
import { hostStoreGet } from './react-doc-host.jsx';
import { zeneObjectStaticCreate } from './zene-object-static.js';

// The app on the device: the component of the doc page's block of mode app (doc/zene-demo.md), with
// the param of that block, over the data built into the app, without the session beside the phone.
// device.css makes the simulated phone the whole screen: no frame, no drawn status bar.
const service = zeneObjectStaticCreate(community);
const data = { param: { ...community.param, isSessionShown: false } };
const config = { objectFrontend: service };
const storeName = `zene-app:${community.partition}`;

export function ZeneDevice() {
	useEffect(() => {
		if (!Capacitor.isNativePlatform()) return undefined;
		const listening = CapacitorApp.addListener('backButton', () => backButtonHandle(hostStoreGet(storeName)));
		return () => { listening.then((one) => one.remove()); };
	}, []);
	return (
		<div className="zene-device">
			<ZeneApp data={data} config={config} />
		</div>
	);
}

// the back button of Android, as the app's own back gestures go: what is open over the screens closes
// first, then a pushed screen goes back, then a tab goes to Home; on Home the app is left
function backButtonHandle(store) {
	if (!store) { CapacitorApp.exitApp(); return; }
	if (store.sheet) store.sheetClose();
	else if (store.menu) store.menuSet(store.menu);
	else if (store.stack.length > 0) store.pop();
	else if (store.tabId !== 'home') store.tabSet('home');
	else CapacitorApp.exitApp();
}
