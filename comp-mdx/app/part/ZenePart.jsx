import { observer } from 'mobx-react-lite';
import { timeTextDisplay } from '@wwf971/react-doc';
import { ChevronLeft, ChevronRight, Lock, MapPin } from 'lucide-react';
import { ZeneAvatar } from './ZeneAvatar.jsx';
import { ZeneIcon } from './ZeneIcon.jsx';

// The pieces every screen of the app is made of (doc/zene-ui.md#screens). Each reads the world it is
// given and asks the app (ZeneApp's context object `app`: the backend, the app store) for what it
// changes; none keeps state of its own.

// the bar at the top of a screen: back, the title, what the screen offers on the right
export function ZeneHeader({ title, subtitle = '', onBack, right = null, isLarge = false }) {
	return (
		<header className={`zene-header${isLarge ? ' is-large' : ''}`}>
			{onBack ? (
				<button type="button" className="zene-header-back" onClick={onBack} aria-label="Back"><ChevronLeft size={22} /></button>
			) : <span className="zene-header-space" />}
			<div className="zene-header-title">
				<span className="zene-header-text">{title}</span>
				{subtitle ? <span className="zene-header-subtitle">{subtitle}</span> : null}
			</div>
			<div className="zene-header-right">{right}</div>
		</header>
	);
}

// a time as a person reads it, with its zone (an event in Tokyo reads +09 wherever it is read)
export function ZeneTime({ time, part = 'minute', isYearShown = true }) {
	const text = timeTextDisplay(time, { part, isYearShown });
	return text ? <time className="zene-time">{text}</time> : null;
}

// a time span of an event: the start with its zone, and the end (its time only when on the same day)
export function ZeneTimeSpan({ timeStart, timeEnd }) {
	const start = timeTextDisplay(timeStart);
	const end = timeTextDisplay(timeEnd);
	if (!end) return <time className="zene-time">{start}</time>;
	const isSameDay = start.slice(0, 10) === end.slice(0, 10);
	return <time className="zene-time">{start.replace(/ ([+-]\d{2})$/, '')} – {isSameDay ? end.slice(11) : end}</time>;
}

// a tag: its sticker and its label
export const ZeneTagChip = observer(function ZeneTagChip({ world, tagId, onClick, isSelected = false, detail = '', size = 'm' }) {
	const tag = world.tag.get(tagId);
	if (!tag) return null;
	const content = (
		<>
			<ZeneIcon name={world.tag.iconOf(tagId)} color={world.tag.colorOf(tagId)} size={size === 's' ? 18 : 22} isSticker />
			<span className="zene-chip-label">{tag.label}</span>
			{detail ? <span className="zene-chip-detail">{detail}</span> : null}
		</>
	);
	if (!onClick) return <span className={`zene-chip is-${size}`}>{content}</span>;
	return <button type="button" className={`zene-chip is-${size}${isSelected ? ' is-selected' : ''}`} aria-pressed={isSelected} onClick={() => onClick(tagId)}>{content}</button>;
});

export function ZeneTagRow({ world, tagIdList, onOpen, size = 'm' }) {
	const idList = [...new Set(tagIdList)].filter((id) => world.tag.get(id));
	if (idList.length === 0) return null;
	return <div className="zene-chip-row">{idList.map((id) => <ZeneTagChip key={id} world={world} tagId={id} onClick={onOpen} size={size} />)}</div>;
}

// a row of a list: a picture, two lines, what stands on its right; a tap opens it
// (the part opening it is a button of its own, so what stands on the right may be a button too)
export function ZeneRow({ picture, title, detail = '', right = null, onOpen, isMuted = false }) {
	const body = (
		<>
			<span className="zene-row-picture">{picture}</span>
			<span className="zene-row-body">
				<span className="zene-row-title">{title}</span>
				{detail ? <span className="zene-row-detail">{detail}</span> : null}
			</span>
			{!right && onOpen ? <ChevronRight size={16} className="zene-row-chevron" /> : null}
		</>
	);
	return (
		<div className={`zene-row${isMuted ? ' is-muted' : ''}${onOpen ? ' is-open' : ''}`}>
			{onOpen ? <button type="button" className="zene-row-main" onClick={onOpen}>{body}</button> : <span className="zene-row-main">{body}</span>}
			{right}
		</div>
	);
}

// an account in a row
export function ZeneAccountRow({ app, world, account, detail, right }) {
	if (!account) return null;
	return (
		<ZeneRow
			picture={<ZeneAvatar account={account} size={38} />}
			title={account.name}
			detail={detail ?? `@${account.handle}`}
			right={right}
			onOpen={() => app.accountOpen(account.id)}
		/>
	);
}

// a person, a group or an event in a row: the account when it has one
export function ZeneSubjectRow({ app, world, kind, id, detail, right }) {
	const account = world.accountOfSubject(kind, id);
	const entity = world.get(kind, id);
	if (!entity) return null;
	if (account) return <ZeneAccountRow app={app} world={world} account={account} detail={detail} right={right} />;
	return (
		<ZeneRow
			picture={<span className="zene-avatar is-badge" style={{ width: 38, height: 38, background: '#e9ecef' }}><ZeneIcon name={kind === 'event' ? eventIconOf(entity) : 'group'} size={26} /></span>}
			title={entity.name}
			detail={detail}
			right={right}
			onOpen={kind === 'event' ? () => app.push('event', { id }) : undefined}
		/>
	);
}

export function eventIconOf(event) {
	return { concert: 'concert', rehearsal: 'stand', session: 'jam', workshop: 'bulb', audition: 'star', meetup: 'group' }[event?.eventKind] ?? 'concert';
}

// an event in a row: when, where, its state
export const ZeneEventRow = observer(function ZeneEventRow({ app, world, event, right }) {
	const account = world.accountOfSubject('event', event.id);
	return (
		<ZeneRow
			picture={account ? <ZeneAvatar account={account} size={38} /> : <span className="zene-avatar is-badge" style={{ width: 38, height: 38, background: '#e9ecef' }}><ZeneIcon name={eventIconOf(event)} size={26} /></span>}
			title={<>{event.visibility === 'member' ? <Lock size={11} className="zene-inline-icon" /> : null}{event.name}</>}
			detail={<><ZeneTimeSpan timeStart={event.timeStart} timeEnd={event.timeEnd} />{event.status !== 'published' ? <span className="zene-pill is-muted">{event.status}</span> : null}</>}
			right={right}
			onOpen={() => app.eventOpen(event.id)}
		/>
	);
});

// a venue line
export function ZeneVenue({ venue }) {
	if (!venue?.name) return null;
	return <span className="zene-venue"><MapPin size={12} />{venue.name}{venue.area ? `, ${venue.area}` : ''}</span>;
}

// the cover of a post's picture, a video or a sound: there are no files in the demonstration, so a
// medium is drawn from its title, icon and color
export function ZeneMediaCover({ media, isSmall = false }) {
	const color = media.color || '#ffd6a5';
	return (
		<div className={`zene-media${isSmall ? ' is-small' : ''}`} style={{ '--zene-media-color': color }}>
			<ZeneIcon name={media.icon || 'note'} size={isSmall ? 42 : 96} />
			{isSmall ? null : <span className="zene-media-title">{media.title}</span>}
			{media.kind !== 'image' ? <span className="zene-media-kind">{media.kind === 'video' ? 'video' : 'sound'}</span> : null}
		</div>
	);
}

// a small count with a word: "12 posts"
export function ZeneStat({ value, label, onClick }) {
	const body = <><strong>{value}</strong><span>{label}</span></>;
	return onClick ? <button type="button" className="zene-stat" onClick={onClick}>{body}</button> : <span className="zene-stat">{body}</span>;
}

// a button that runs an action of the catalog (model/ZeneAction.js) for the person on the device:
// shown greyed with the reason as its title when they may not; the result is said by a toast and
// the session panel shows what it changed
export const ZeneActionButton = observer(function ZeneActionButton({ app, actionId, input = {}, label, tone = '', onDone, isCompact = false, Icon }) {
	const reason = app.backend.actionReasonGet(actionId, app.store.actor, input);
	return (
		<button
			type="button"
			className={`zene-button${tone ? ` is-${tone}` : ''}${isCompact ? ' is-compact' : ''}`}
			disabled={Boolean(reason)}
			title={reason || undefined}
			onClick={() => {
				const answer = app.actionRun(actionId, input);
				if (answer.code === 0) onDone?.(answer.data.result);
			}}
		>
			{Icon ? <Icon size={14} /> : null}
			{label}
		</button>
	);
});

// what a screen shows when it has nothing to show
export function ZeneEmpty({ icon = 'note', text, children = null }) {
	return (
		<div className="zene-empty">
			<ZeneIcon name={icon} size={56} isSticker />
			<p>{text}</p>
			{children}
		</div>
	);
}

// a section of a screen: a small heading and what it holds
export function ZeneSection({ title, detail = '', right = null, children }) {
	return (
		<section className="zene-section">
			<div className="zene-section-head">
				<h3 className="zene-section-title">{title}</h3>
				{detail ? <span className="zene-section-detail">{detail}</span> : null}
				{right}
			</div>
			{children}
		</section>
	);
}

export function amountText(amount, currency) {
	if (!amount) return 'free';
	try {
		return new Intl.NumberFormat('en', { style: 'currency', currency: currency || 'JPY', maximumFractionDigits: 0 }).format(amount);
	} catch {
		return `${amount} ${currency}`;
	}
}
