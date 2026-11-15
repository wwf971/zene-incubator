import { observer } from 'mobx-react-lite';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
	ZENE_AVAILABILITY_STATE_LIST, ZENE_DAY_PART_LIST, ZENE_DAY_PART_SHOWN_LIST, ZENE_WEEKDAY_LIST, zeneAvailabilityNormalize, zeneAvailabilityReport,
	zeneAvailabilityResolve, zeneDayPartListText, zeneDayText, zeneDeclarationText, zeneIsoWeekOf, zeneMonthLabel, zeneSpanOfDay, zeneSpanSame,
	zeneSpanText, zeneWeekStartOf, zeneWeekdayOf,
} from '../../model/ZeneAvailability.js';
import { ZeneAddButton, ZeneInlineText, ZeneRemoveButton } from '../part/ZeneInline.jsx';
import { ZeneSection } from '../part/ZenePart.jsx';

// When a person (or a group) can play, on their homepage (doc/zene-availability.md#on-the-homepage):
// the status they are in, the usual and the next free times, a calendar of the parts of each day
// coloured by the state the declarations give them, and the declarations themselves, from the most
// general to the most specific. A tap on the calendar says which declaration decided that part of
// the day. In the edit mode of the homepage the same view is where one declares: a tap on a day, a
// part of a day, a week or a month declares for it; the status is set where it is shown.

const WEEK_SHOWN_COUNT = 6;
const STATE_LABEL = Object.fromEntries(ZENE_AVAILABILITY_STATE_LIST.map((one) => [one.id, one]));
const DAY_PART_LABEL = Object.fromEntries(ZENE_DAY_PART_LIST.map((one) => [one.id, one.label]));
const WEEKDAY_LABEL = Object.fromEntries(ZENE_WEEKDAY_LIST.map((one) => [one.id, one.label]));

export const ZeneAvailabilitySection = observer(function ZeneAvailabilitySection({ app, subject, isEditing }) {
	const world = app.world;
	const held = world.availabilityOfSubject(subject.kind, subject.id);
	if (!held && !isEditing) return null;
	const availability = held ?? zeneAvailabilityNormalize({ subject, zone: '+09' });
	const report = zeneAvailabilityReport(availability, { time: app.time, weekCount: 8 });
	const viewKey = `${subject.kind}:${subject.id}`;
	const view = app.store.availabilityViewGet(viewKey);
	return (
		<ZeneSection title="Availability" detail={`days and hours in ${availability.zone}`}>
			<ZeneAvailabilityStatus app={app} subject={subject} availability={availability} report={report} isEditing={isEditing} />
			{report.usualList.length > 0 || report.nextFreeList.length > 0 ? (
				<div className="zene-avail-summary">
					{report.usualList.length > 0 ? (
						<p><strong>Usually free</strong> {report.usualList.map((one) => `${WEEKDAY_LABEL[one.weekday]} ${zeneDayPartListText(one.partList)}`).join(' · ')}</p>
					) : null}
					{report.nextFreeList.length > 0 ? (
						<p><strong>Next free</strong> {report.nextFreeList.map((one) => `${WEEKDAY_LABEL[one.weekday]} ${one.text.slice(5)} ${zeneDayPartListText(one.partList)}`).join(' · ')}</p>
					) : null}
				</div>
			) : null}
			<ZeneAvailabilityCalendar app={app} subject={subject} availability={availability} report={report} view={view} viewKey={viewKey} isEditing={isEditing} />
			<ZeneDeclarationList app={app} subject={subject} availability={availability} report={report} isEditing={isEditing} />
		</ZeneSection>
	);
});

// the status: what the person said of now, while it holds; else what the next two weeks say
const ZeneAvailabilityStatus = observer(function ZeneAvailabilityStatus({ app, subject, availability, report, isEditing }) {
	const { status } = report;
	const current = availability.current;
	const set = (change) => app.actionRun('availability.currentSet', {
		subject, state: current?.state ?? 'available', note: current?.note ?? '', until: current?.until ?? '', ...change,
	});
	const label = status.source === 'current' ? STATE_LABEL[status.state]?.labelCurrent
		: status.source === 'declared' ? `${STATE_LABEL[status.state]?.label} in the next two weeks`
			: 'Nothing said yet';
	return (
		<div className="zene-avail-status" data-state={status.state || 'none'}>
			<div className="zene-avail-status-head">
				<span className="zene-avail-dot" data-state={status.state || 'none'} />
				<strong>{label}</strong>
				{status.source === 'declared' ? <span className="zene-avail-status-source">from the calendar</span> : null}
			</div>
			{isEditing ? (
				<>
					<div className="zene-avail-state-row" role="radiogroup" aria-label="How you are now">
						{ZENE_AVAILABILITY_STATE_LIST.map((one) => (
							<button key={one.id} type="button" role="radio" aria-checked={current?.state === one.id} className={`zene-avail-state-button${current?.state === one.id ? ' is-on' : ''}`} data-state={one.id} onClick={() => set({ state: one.id })}>
								{one.labelCurrent}
							</button>
						))}
						<button type="button" role="radio" aria-checked={!current} className={`zene-avail-state-button${current ? '' : ' is-on'}`} data-state="none" title="Say nothing: the status is read from the calendar" onClick={() => set({ state: '' })}>
							Say nothing
						</button>
					</div>
					{current ? (
						<div className="zene-avail-status-edit">
							<ZeneInlineText app={app} inputKey={`current-note:${subject.id}`} value={current.note} isEditing placeholder="a note: why, what for" onCommit={(note) => set({ note })} />
							<label className="zene-avail-until">
								<span>until</span>
								<ZeneInlineText app={app} inputKey={`current-until:${subject.id}`} value={current.until} isEditing type="date" onCommit={(until) => set({ until })} />
								<span className="zene-avail-zone">{availability.zone}</span>
							</label>
						</div>
					) : null}
				</>
			) : (
				<>
					{status.current?.note ? <p className="zene-avail-status-note">{status.current.note}</p> : null}
					{status.current?.until ? <p className="zene-avail-status-until">until {status.current.until} {availability.zone}</p> : null}
				</>
			)}
		</div>
	);
});

// six weeks from the Monday of this week, moved four weeks at a time
const ZeneAvailabilityCalendar = observer(function ZeneAvailabilityCalendar({ app, subject, availability, report, view, viewKey, isEditing }) {
	const dayFrom = zeneWeekStartOf(report.today) + view.weekOffset * 7;
	const { dayList } = zeneAvailabilityResolve(availability, { dayFrom, dayCount: WEEK_SHOWN_COUNT * 7 });
	const weekList = Array.from({ length: WEEK_SHOWN_COUNT }, (_, index) => dayList.slice(index * 7, index * 7 + 7));
	const select = (selection) => app.store.availabilityViewSet(viewKey, { selection });
	const isSelected = (unit, day, dayPart = '') => view.selection?.unit === unit && view.selection.day === day && (view.selection.dayPart ?? '') === dayPart;
	return (
		<div className="zene-avail-calendar" data-zene-noswipe="">
			<div className="zene-avail-nav">
				<button type="button" className="zene-icon-button" aria-label="Four weeks before" onClick={() => app.store.availabilityViewSet(viewKey, { weekOffset: view.weekOffset - 4 })}><ChevronLeft size={16} /></button>
				<span className="zene-avail-nav-text">{zeneDayText(dayFrom).slice(5)} – {zeneDayText(dayFrom + WEEK_SHOWN_COUNT * 7 - 1).slice(5)} {availability.zone}</span>
				<button type="button" className="zene-icon-button" aria-label="Four weeks after" onClick={() => app.store.availabilityViewSet(viewKey, { weekOffset: view.weekOffset + 4 })}><ChevronRight size={16} /></button>
				{view.weekOffset !== 0 ? <button type="button" className="zene-link" onClick={() => app.store.availabilityViewSet(viewKey, { weekOffset: 0 })}>This week</button> : null}
			</div>
			<div className="zene-avail-grid">
				<span className="zene-avail-corner" />
				{ZENE_WEEKDAY_LIST.map((one) => <span key={one.id} className="zene-avail-weekday">{one.label}</span>)}
				{weekList.map((week) => {
					const monthDay = week.find((one) => one.text.endsWith('-01'));
					const weekStart = week[0].day;
					return [
						<button key={`w${weekStart}`} type="button" className={`zene-avail-week${isSelected('week', weekStart) ? ' is-selected' : ''}`} title="The whole week" onClick={() => select({ unit: 'week', day: weekStart })}>
							{monthDay || weekStart === dayFrom ? zeneMonthLabel((monthDay ?? week[0]).day) : `W${zeneIsoWeekOf(weekStart).week}`}
						</button>,
						...week.map((one) => (
							<div key={one.day} className={`zene-avail-day${one.day === report.today ? ' is-today' : ''}${one.day < report.today ? ' is-past' : ''}${isSelected('day', one.day) ? ' is-selected' : ''}`}>
								<button type="button" className="zene-avail-day-number" title={`${one.text} ${availability.zone}`} onClick={() => select({ unit: 'day', day: one.day })}>
									{Number(one.text.slice(8))}
								</button>
								{one.partList.map((part) => (
									<button key={part.dayPart} type="button" className={`zene-avail-part${part.isPartial ? ' is-partial' : ''}${isSelected('part', one.day, part.dayPart) ? ' is-selected' : ''}`} data-state={part.state || 'none'} title={`${one.text} ${DAY_PART_LABEL[part.dayPart].toLowerCase()}: ${part.state || 'not said'}`} onClick={() => select({ unit: 'part', day: one.day, dayPart: part.dayPart })} />
								))}
							</div>
						)),
					];
				})}
			</div>
			<div className="zene-avail-legend">
				{ZENE_AVAILABILITY_STATE_LIST.map((one) => <span key={one.id}><i data-state={one.id} />{one.label.toLowerCase()}</span>)}
				<span><i data-state="none" />not said</span>
				<span><i data-state="available" className="is-partial" />part of it</span>
				<span className="zene-avail-legend-part">bars: {ZENE_DAY_PART_SHOWN_LIST.join(', ')}</span>
			</div>
			<ZeneAvailabilitySelection app={app} subject={subject} availability={availability} selection={view.selection} isEditing={isEditing} onMonth={(day) => select({ unit: 'month', day })} />
		</div>
	);
});

// what was tapped: the state of each part and the declaration that decided it; in edit mode, the
// buttons declaring for it
const ZeneAvailabilitySelection = observer(function ZeneAvailabilitySelection({ app, subject, availability, selection, isEditing, onMonth }) {
	if (!selection) {
		return <p className="zene-avail-detail is-hint">{isEditing ? 'Tap a day, a part of a day, or a week to declare for it.' : 'Tap a day or a part of it: what decided it is shown here.'}</p>;
	}
	const zone = availability.zone;
	const isPart = selection.unit === 'part';
	const span = zeneSpanOfDay(isPart ? 'day' : selection.unit, selection.day);
	const dayPartList = isPart ? [selection.dayPart] : [];
	const title = isPart ? `${WEEKDAY_LABEL[zeneWeekdayOf(selection.day)]} ${zeneSpanText(span, zone)} · ${DAY_PART_LABEL[selection.dayPart].toLowerCase()}`
		: selection.unit === 'day' ? `${WEEKDAY_LABEL[zeneWeekdayOf(selection.day)]} ${zeneSpanText(span, zone)}` : zeneSpanText(span, zone);
	const byId = new Map(availability.declarationList.map((one) => [one.id, one]));
	const explainList = selection.unit === 'day' || isPart
		? zeneAvailabilityResolve(availability, { dayFrom: selection.day, dayCount: 1, dayPartList: isPart ? [selection.dayPart] : ZENE_DAY_PART_SHOWN_LIST }).dayList[0].partList
		: [];
	const same = availability.declarationList.find((one) => zeneSpanSame(one.span, span) && one.weekdayList.length === 0 && !one.hourFrom
		&& one.dayPartList.join() === dayPartList.join());
	const declare = (state) => app.actionRun('availability.declare', { subject, declaration: { ...(same ? { id: same.id, note: same.note } : {}), state, span, dayPartList } });
	return (
		<div className="zene-avail-detail">
			<p className="zene-avail-detail-title">
				<strong>{title}</strong>
				{selection.unit === 'day' || isPart ? <button type="button" className="zene-link" onClick={() => onMonth(selection.day)}>the whole {zeneMonthLabel(selection.day)}</button> : null}
			</p>
			{explainList.map((part) => {
				const declaration = part.declarationId === 'current' ? { text: 'the current state' } : byId.get(part.declarationId);
				return (
					<p key={part.dayPart} className="zene-avail-detail-line">
						<span className="zene-avail-dot" data-state={part.state || 'none'} />
						{DAY_PART_LABEL[part.dayPart]}: {part.state ? `${part.state}${part.isPartial ? ' (part of it)' : ''}` : 'not said'}
						{declaration ? <em> by {declaration.text ?? zeneDeclarationText(declaration, zone)}</em> : null}
					</p>
				);
			})}
			{isEditing ? (
				<div className="zene-avail-declare-row">
					<span>Declare</span>
					{ZENE_AVAILABILITY_STATE_LIST.map((one) => (
						<button key={one.id} type="button" className={`zene-avail-state-button${same?.state === one.id ? ' is-on' : ''}`} data-state={one.id} onClick={() => declare(one.id)}>{one.label}</button>
					))}
					{same ? <button type="button" className="zene-avail-state-button" data-state="none" title="Take back what was declared for exactly this" onClick={() => app.actionRun('availability.remove', { subject, declarationId: same.id })}>Take back</button> : null}
				</div>
			) : null}
		</div>
	);
});

// the declarations, the most general first: each decides what the narrower ones after it leave
const ZeneDeclarationList = observer(function ZeneDeclarationList({ app, subject, availability, report, isEditing }) {
	const list = [...report.declarationList].sort((a, b) => b.coverHours - a.coverHours);
	if (list.length === 0 && !isEditing) return null;
	return (
		<div className="zene-avail-declared">
			<p className="zene-avail-declared-title">Declared <em>from the most general to the most specific; a narrower one wins where they meet</em></p>
			{list.map(({ declaration, isOverridden, isOutOfView }) => (
				<div key={declaration.id} className={`zene-avail-declaration${isOverridden ? ' is-overridden' : ''}`}>
					<span className="zene-avail-dot" data-state={declaration.state} title={declaration.state} />
					<button type="button" className="zene-avail-declaration-text" disabled={!isEditing} title={isEditing ? 'Change it' : undefined} onClick={() => app.store.sheetOpen('availabilityDeclare', { subject, declarationId: declaration.id })}>
						<span>{zeneDeclarationText(declaration, availability.zone)}</span>
						{declaration.note ? <em>{declaration.note}</em> : null}
					</button>
					{isOverridden ? <span className="zene-pill is-muted" title="Narrower declarations decide every part it covers in the next weeks">overridden</span> : null}
					{isOutOfView ? <span className="zene-pill is-muted" title="It covers nothing in the next eight weeks">later</span> : null}
					{isEditing ? <ZeneRemoveButton title="Take it back" onClick={() => app.actionRun('availability.remove', { subject, declarationId: declaration.id })} /> : null}
				</div>
			))}
			{isEditing ? <ZeneAddButton label="Declare for weekdays, a month, a season, hours" onClick={() => app.store.sheetOpen('availabilityDeclare', { subject })} /> : null}
		</div>
	);
});
