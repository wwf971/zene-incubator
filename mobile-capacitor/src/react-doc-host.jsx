import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// The stand-in of @wwf971/react-doc in the app (vite.config.js points the name here). The app's
// components in doc-page/comp-mdx/app/ import four things from react-doc; on the device there is no
// document around them, and each is what is left of it without one. A component of the doc page that
// starts to import something else from react-doc fails the build here ("is not exported"), which is
// the moment to add its stand-in. Design: doc-page/doc/zene-deploy-mobile-capacitor.md.

// the block popup: on the device the app is the whole screen, never in a popup
export function BlockPopupSurface({ className = '', children }) {
	return <div className={className}>{children({ isInPopup: false })}</div>;
}

// the store of a block, kept across mounts by react-doc: here one per name for the whole run, which
// the host also reads (the Android back button acts on the app's store)
const storeByName = new Map();

export function useCompStateStore(config, name, create) {
	const [store] = useState(() => {
		if (!storeByName.has(name)) storeByName.set(name, create());
		return storeByName.get(name);
	});
	return store;
}

export function hostStoreGet(name) {
	return storeByName.get(name);
}

// react-doc main/frontend/src/lib/time-text.js: a time as a person reads it, always with its zone
//   time   20261115_04441234+09 (shown in the zone it carries), milliseconds, a Date or an iso text
export function timeTextDisplay(time, { part = 'minute', isYearShown = true } = {}) {
	const pad = (value) => String(value).padStart(2, '0');
	let field;
	const match = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})?\d*([+-]\d{2})?/.exec(typeof time === 'string' ? time : '');
	if (match) {
		field = { year: match[1], month: match[2], day: match[3], hour: match[4], minute: match[5], second: match[6] ?? '00', zone: match[7] ?? '+00' };
	} else {
		if (time === undefined || time === null || time === '' || time === 0) return '';
		const date = time instanceof Date ? time : new Date(time);
		if (Number.isNaN(date.getTime())) return '';
		const zoneHours = -Math.round(date.getTimezoneOffset() / 60);
		field = {
			year: String(date.getFullYear()), month: pad(date.getMonth() + 1), day: pad(date.getDate()),
			hour: pad(date.getHours()), minute: pad(date.getMinutes()), second: pad(date.getSeconds()),
			zone: `${zoneHours < 0 ? '-' : '+'}${pad(Math.abs(zoneHours))}`,
		};
	}
	const dateText = isYearShown ? `${field.year}-${field.month}-${field.day}` : `${field.month}-${field.day}`;
	if (part === 'date') return `${dateText} ${field.zone}`;
	return `${dateText} ${field.hour}:${field.minute}${part === 'second' ? `:${field.second}` : ''} ${field.zone}`;
}

// a homepage: markdown with tables (GFM). react-doc renders MDX, so a homepage writing a component
// (<Something />) shows it there and not here; the homepages of the example are plain markdown.
// A link out of the app opens in the browser of the phone (Capacitor does so for another host); a
// link to a document has no document to go to on the device, and stays text.
const markdownComponentByTag = {
	a({ href = '', children, node, ...rest }) {
		if (/^(https?:|mailto:|tel:)/.test(href)) return <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a>;
		return <span className="zene-link-local" title={href}>{children}</span>;
	},
};

export function MdxRenderer({ data = {}, config = {} }) {
	return (
		<div className={config.className ?? ''}>
			<Markdown remarkPlugins={[remarkGfm]} components={markdownComponentByTag}>{data.source ?? ''}</Markdown>
		</div>
	);
}
