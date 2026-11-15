import { observer } from 'mobx-react-lite';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ZENE_WEEKDAY_LIST, zeneDayOf, zeneDayOfTime, zeneDayText, zeneWeekStartOf } from '../../model/ZeneAvailability.js';
import { ZeneIcon } from './ZeneIcon.jsx';
import { eventIconOf, ZeneEventRow } from './ZenePart.jsx';

// Events on a month (doc/zene-ui.md#homepages): a grid of the days of one month, each day with the
// events on it (an event of several days on each of them), today framed; a tap on a day lists its
// events below. Days are read in the zone each event is written in, so a concert at 14:00 +09 is on
// its own day wherever the page is read.
//
//   eventList     the events of the view (those the person may see)
//   calendarKey   the key of its state in the app store: the month shown, the day selected

const MONTH_NAME_LIST = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const KIND_COLOR = { concert: '#f4a261', rehearsal: '#8ecae6', session: '#cdb4db', workshop: '#ffd166', audition: '#95d5b2', meetup: '#e5989b' };

export const ZeneEventCalendar = observer(function ZeneEventCalendar({ app, eventList, calendarKey }) {
	const today = zeneDayOfTime(app.time);
	const todayText = zeneDayText(today);
	const ui = app.store.uiGet(calendarKey, { month: todayText.slice(0, 7), day: '' });
	const [year, month] = ui.month.split('-').map(Number);
	const dayFirst = zeneDayOf(`${ui.month}-01`);
	const dayLast = Date.UTC(year, month, 1) / 86400000 - 1;
	const gridFrom = zeneWeekStartOf(dayFirst);
	const weekCount = Math.ceil((dayLast - gridFrom + 1) / 7);
	// the events of each day: every day from the day it starts to the day it ends
	const eventListByDay = new Map();
	for (const event of eventList) {
		const dayStart = zeneDayOfTime(event.timeStart);
		const dayEnd = zeneDayOfTime(event.timeEnd || event.timeStart);
		if (Number.isNaN(dayStart)) continue;
		for (let day = dayStart; day <= Math.max(dayStart, dayEnd); day += 1) {
			if (!eventListByDay.has(day)) eventListByDay.set(day, []);
			eventListByDay.get(day).push(event);
		}
	}
	const monthMove = (step) => {
		const date = new Date(Date.UTC(year, month - 1 + step, 1));
		app.store.uiSet(calendarKey, { month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`, day: '' });
	};
	const daySelected = ui.day ? zeneDayOf(ui.day) : Number.NaN;
	const listOfDay = Number.isNaN(daySelected) ? [] : eventListByDay.get(daySelected) ?? [];
	const countInMonth = eventList.filter((event) => { const day = zeneDayOfTime(event.timeStart); return day >= dayFirst && day <= dayLast; }).length;
	return (
		<div className="zene-calendar" data-zene-noswipe="">
			<div className="zene-calendar-nav">
				<button type="button" className="zene-icon-button" aria-label="The month before" onClick={() => monthMove(-1)}><ChevronLeft size={16} /></button>
				<strong>{MONTH_NAME_LIST[month - 1]} {year}</strong>
				<button type="button" className="zene-icon-button" aria-label="The month after" onClick={() => monthMove(1)}><ChevronRight size={16} /></button>
				<span className="zene-calendar-count">{countInMonth} {countInMonth === 1 ? 'event' : 'events'}</span>
				{ui.month !== todayText.slice(0, 7) ? <button type="button" className="zene-link" onClick={() => app.store.uiSet(calendarKey, { month: todayText.slice(0, 7), day: '' })}>Today</button> : null}
			</div>
			<div className="zene-calendar-grid">
				{ZENE_WEEKDAY_LIST.map((one) => <span key={one.id} className="zene-calendar-weekday">{one.label}</span>)}
				{Array.from({ length: weekCount * 7 }, (_, index) => {
					const day = gridFrom + index;
					const isInMonth = day >= dayFirst && day <= dayLast;
					const dayEventList = eventListByDay.get(day) ?? [];
					return (
						<button
							key={day}
							type="button"
							className={`zene-calendar-day${isInMonth ? '' : ' is-outside'}${day === today ? ' is-today' : ''}${day === daySelected ? ' is-selected' : ''}${day < today ? ' is-past' : ''}`}
							title={dayEventList.map((one) => one.name).join('\n') || undefined}
							onClick={() => app.store.uiSet(calendarKey, { day: day === daySelected ? '' : zeneDayText(day) })}
						>
							<span className="zene-calendar-number">{Number(zeneDayText(day).slice(8))}</span>
							<span className="zene-calendar-mark-row">
								{dayEventList.slice(0, 2).map((event) => (
									<span key={event.id} className="zene-calendar-mark" style={{ background: KIND_COLOR[event.eventKind] ?? '#e9ecef' }}>
										<ZeneIcon name={eventIconOf(event)} size={13} />
									</span>
								))}
								{dayEventList.length > 2 ? <span className="zene-calendar-more">+{dayEventList.length - 2}</span> : null}
							</span>
						</button>
					);
				})}
			</div>
			<div className="zene-calendar-day-list">
				{Number.isNaN(daySelected)
					? <p className="zene-note">Tap a day to see its events.</p>
					: listOfDay.length === 0
						? <p className="zene-note">Nothing on {ui.day} {app.time.slice(-3)}.</p>
						: <div className="zene-row-list">{listOfDay.map((event) => <ZeneEventRow key={event.id} app={app} world={app.world} event={event} />)}</div>}
			</div>
		</div>
	);
});
