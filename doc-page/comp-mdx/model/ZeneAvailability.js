// Availability (doc/zene-availability.md): when a person (or a group) can play, declared at whatever
// scale they know it, and merged into one picture.
//
//   a declaration   a state (available | limited | unavailable) over a time:
//                     a span       always (every week) | a year | a season | a month | a week | a day | a range of days
//                     a filter     some weekdays, some parts of the day (or exact hours); absent: all of them
//   current         the state the person is in now, maybe until a day: shown as their status
//   merging         each part of each day takes the state of the most specific declaration covering it
//                   (the one covering the fewest hours), the latest one when two are as specific
//
// Dates are local dates in the zone of the availability ('2027-01-24' in +09); a day is handled as
// its number of days since 1970-01-01, so no time zone is ever crossed while merging.

export const ZENE_AVAILABILITY_STATE_LIST = [
	{ id: 'available', label: 'Available', labelCurrent: 'Open for new music' },
	{ id: 'limited', label: 'Limited', labelCurrent: 'Some time, ask' },
	{ id: 'unavailable', label: 'Unavailable', labelCurrent: 'Not taking anything' },
];
const STATE_ID_LIST = ZENE_AVAILABILITY_STATE_LIST.map((one) => one.id);

// the parts of a day, by the hours they cover; night is kept for late sessions, and the calendar
// shows the three parts people plan with
export const ZENE_DAY_PART_LIST = [
	{ id: 'night', label: 'Night', hourFrom: 0, hourTo: 6 },
	{ id: 'morning', label: 'Morning', hourFrom: 6, hourTo: 12 },
	{ id: 'afternoon', label: 'Afternoon', hourFrom: 12, hourTo: 18 },
	{ id: 'evening', label: 'Evening', hourFrom: 18, hourTo: 24 },
];
export const ZENE_DAY_PART_SHOWN_LIST = ['morning', 'afternoon', 'evening'];
const DAY_PART_BY_ID = new Map(ZENE_DAY_PART_LIST.map((one) => [one.id, one]));

export const ZENE_WEEKDAY_LIST = [
	{ id: 'mon', label: 'Mon' }, { id: 'tue', label: 'Tue' }, { id: 'wed', label: 'Wed' }, { id: 'thu', label: 'Thu' },
	{ id: 'fri', label: 'Fri' }, { id: 'sat', label: 'Sat' }, { id: 'sun', label: 'Sun' },
];
const WEEKDAY_ID_LIST = ZENE_WEEKDAY_LIST.map((one) => one.id);

// the scales of a span, from the widest
export const ZENE_SPAN_UNIT_LIST = [
	{ id: 'always', label: 'Always', description: 'every week, from now on' },
	{ id: 'year', label: 'Year' },
	{ id: 'season', label: 'Season' },
	{ id: 'month', label: 'Month' },
	{ id: 'week', label: 'Week' },
	{ id: 'range', label: 'Days', description: 'from one day to another' },
	{ id: 'day', label: 'Day' },
];
const SPAN_UNIT_ID_LIST = ZENE_SPAN_UNIT_LIST.map((one) => one.id);

// seasons as a calendar of the northern hemisphere has them; winter 2026 is Dec 2026 to Feb 2027
export const ZENE_SEASON_LIST = [
	{ id: 'spring', label: 'Spring', monthFrom: 3 },
	{ id: 'summer', label: 'Summer', monthFrom: 6 },
	{ id: 'autumn', label: 'Autumn', monthFrom: 9 },
	{ id: 'winter', label: 'Winter', monthFrom: 12 },
];
const MONTH_LABEL_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAME_LIST = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "always" is a span too: as specific as ten years, so anything dated wins over it
const ALWAYS_DAY_COUNT = 3650;
const DAY_MS = 24 * 3600 * 1000;

// --- days -----------------------------------------------------------------------------------------

// '2027-01-24' -> its day number; NaN for what is not a date
export function zeneDayOf(text) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text ?? ''));
	if (!match) return Number.NaN;
	return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS);
}

export function zeneDayText(day) {
	const date = new Date(day * DAY_MS);
	const pad = (value) => String(value).padStart(2, '0');
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// the local day of a time text of the project's format (20261115_12000000+09 -> 2026-11-15)
export function zeneDayOfTime(timeText) {
	const match = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/.exec(String(timeText ?? ''));
	return match ? zeneDayOf(`${match[1]}-${match[2]}-${match[3]}`) : Number.NaN;
}

// mon | tue | ... of a day
export function zeneWeekdayOf(day) {
	return WEEKDAY_ID_LIST[(new Date(day * DAY_MS).getUTCDay() + 6) % 7];
}

// the Monday of the week of a day
export function zeneWeekStartOf(day) {
	return day - WEEKDAY_ID_LIST.indexOf(zeneWeekdayOf(day));
}

function dayOfYmd(year, month, date) {
	return Math.floor(Date.UTC(year, month - 1, date) / DAY_MS);
}

// the ISO week of a day: { year, week }
export function zeneIsoWeekOf(day) {
	const thursday = zeneWeekStartOf(day) + 3;
	const year = new Date(thursday * DAY_MS).getUTCFullYear();
	return { year, week: Math.floor((thursday - dayOfYmd(year, 1, 1)) / 7) + 1 };
}

function isoWeekStart(year, week) {
	const jan4 = dayOfYmd(year, 1, 4);
	return zeneWeekStartOf(jan4) + (week - 1) * 7;
}

// --- spans --------------------------------------------------------------------------------------

// the days a span covers, both ends included: { dayFrom, dayTo }; always: the whole line; null when
// the span cannot be read
export function zeneSpanDayRange(span) {
	const unit = span?.unit;
	const value = String(span?.value ?? '');
	if (unit === 'always') return { dayFrom: -Infinity, dayTo: Infinity };
	if (unit === 'year') {
		const year = Number(/^(\d{4})$/.exec(value)?.[1]);
		return year ? { dayFrom: dayOfYmd(year, 1, 1), dayTo: dayOfYmd(year + 1, 1, 1) - 1 } : null;
	}
	if (unit === 'season') {
		const match = /^(\d{4})-(spring|summer|autumn|winter)$/.exec(value);
		if (!match) return null;
		const year = Number(match[1]);
		const monthFrom = ZENE_SEASON_LIST.find((one) => one.id === match[2]).monthFrom;
		return { dayFrom: dayOfYmd(year, monthFrom, 1), dayTo: dayOfYmd(year, monthFrom + 3, 1) - 1 };
	}
	if (unit === 'month') {
		const match = /^(\d{4})-(\d{2})$/.exec(value);
		if (!match) return null;
		const year = Number(match[1]);
		const month = Number(match[2]);
		if (month < 1 || month > 12) return null;
		return { dayFrom: dayOfYmd(year, month, 1), dayTo: dayOfYmd(year, month + 1, 1) - 1 };
	}
	if (unit === 'week') {
		const match = /^(\d{4})-W(\d{2})$/.exec(value);
		if (!match) return null;
		const dayFrom = isoWeekStart(Number(match[1]), Number(match[2]));
		return { dayFrom, dayTo: dayFrom + 6 };
	}
	if (unit === 'day') {
		const day = zeneDayOf(value);
		return Number.isNaN(day) ? null : { dayFrom: day, dayTo: day };
	}
	if (unit === 'range') {
		const dayFrom = zeneDayOf(span?.from);
		const dayTo = zeneDayOf(span?.to);
		return Number.isNaN(dayFrom) || Number.isNaN(dayTo) || dayTo < dayFrom ? null : { dayFrom, dayTo };
	}
	return null;
}

// the span of each scale around a day: what a tap on the calendar declares
export function zeneSpanOfDay(unit, day) {
	const text = zeneDayText(day);
	if (unit === 'day') return { unit: 'day', value: text };
	if (unit === 'week') {
		const { year, week } = zeneIsoWeekOf(day);
		return { unit: 'week', value: `${year}-W${String(week).padStart(2, '0')}` };
	}
	if (unit === 'month') return { unit: 'month', value: text.slice(0, 7) };
	if (unit === 'season') {
		const year = Number(text.slice(0, 4));
		const month = Number(text.slice(5, 7));
		const season = month >= 12 || month <= 2 ? 'winter' : month >= 9 ? 'autumn' : month >= 6 ? 'summer' : 'spring';
		return { unit: 'season', value: `${month <= 2 ? year - 1 : year}-${season}` };
	}
	if (unit === 'year') return { unit: 'year', value: text.slice(0, 4) };
	return { unit: 'always' };
}

export function zeneSpanSame(a, b) {
	return a?.unit === b?.unit && String(a?.value ?? '') === String(b?.value ?? '') && String(a?.from ?? '') === String(b?.from ?? '') && String(a?.to ?? '') === String(b?.to ?? '');
}

// --- declarations -------------------------------------------------------------------------------

const textOf = (value) => (value === undefined || value === null ? '' : String(value));
const hourMinute = (text) => {
	const match = /^(\d{1,2}):(\d{2})$/.exec(textOf(text));
	if (!match) return Number.NaN;
	const minute = Number(match[1]) * 60 + Number(match[2]);
	return minute >= 0 && minute <= 24 * 60 ? minute : Number.NaN;
};

export function zeneDeclarationNormalize(data = {}) {
	return {
		id: textOf(data.id),
		state: STATE_ID_LIST.includes(data.state) ? data.state : 'available',
		span: {
			unit: SPAN_UNIT_ID_LIST.includes(data.span?.unit) ? data.span.unit : 'always',
			value: textOf(data.span?.value),
			from: textOf(data.span?.from),
			to: textOf(data.span?.to),
		},
		weekdayList: (Array.isArray(data.weekdayList) ? data.weekdayList : []).filter((one) => WEEKDAY_ID_LIST.includes(one)),
		dayPartList: (Array.isArray(data.dayPartList) ? data.dayPartList : []).filter((one) => DAY_PART_BY_ID.has(one)),
		hourFrom: textOf(data.hourFrom),
		hourTo: textOf(data.hourTo),
		note: textOf(data.note),
		timeDeclared: textOf(data.timeDeclared),
	};
}

export function zeneAvailabilityNormalize(data = {}) {
	const current = data.current && STATE_ID_LIST.includes(data.current.state)
		? { state: data.current.state, note: textOf(data.current.note), until: textOf(data.current.until), timeDeclared: textOf(data.current.timeDeclared) }
		: null;
	return {
		subject: { kind: textOf(data.subject?.kind), id: textOf(data.subject?.id) },
		zone: textOf(data.zone) || '+09',
		current,
		declarationList: (Array.isArray(data.declarationList) ? data.declarationList : []).map(zeneDeclarationNormalize),
	};
}

// '' when a declaration can be read, else why not
export function zeneDeclarationCheck(declaration) {
	if (!STATE_ID_LIST.includes(declaration?.state)) return `a state is one of ${STATE_ID_LIST.join(', ')}`;
	if (!zeneSpanDayRange(declaration.span)) return 'say when: the span cannot be read';
	const isHour = declaration.hourFrom || declaration.hourTo;
	if (isHour) {
		const from = hourMinute(declaration.hourFrom);
		const to = hourMinute(declaration.hourTo);
		if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return 'hours go from an earlier to a later time of the same day, 00:00 to 24:00';
	}
	return '';
}

// the minutes of a day a declaration covers: [[from, to), ...]
function windowListOf(declaration) {
	if (declaration.hourFrom || declaration.hourTo) {
		const from = hourMinute(declaration.hourFrom);
		const to = hourMinute(declaration.hourTo);
		return Number.isNaN(from) || Number.isNaN(to) ? [] : [[from, to]];
	}
	if (declaration.dayPartList.length > 0) return declaration.dayPartList.map((id) => DAY_PART_BY_ID.get(id)).map((part) => [part.hourFrom * 60, part.hourTo * 60]);
	return [[0, 24 * 60]];
}

// how much time a declaration covers, in hours: the narrower, the more it says, and the more it
// wins over the others
export function zeneDeclarationCoverHours(declaration) {
	const range = zeneSpanDayRange(declaration.span);
	if (!range) return Infinity;
	const dayCount = Number.isFinite(range.dayFrom) ? range.dayTo - range.dayFrom + 1 : ALWAYS_DAY_COUNT;
	const weekdayShare = declaration.weekdayList.length > 0 ? declaration.weekdayList.length / 7 : 1;
	const hourPerDay = windowListOf(declaration).reduce((sum, [from, to]) => sum + (to - from), 0) / 60;
	return dayCount * weekdayShare * hourPerDay;
}

// whether a declaration covers a part of a day: 'full' | 'partial' | ''
function coverOf(declaration, range, day, weekday, part) {
	if (day < range.dayFrom || day > range.dayTo) return '';
	if (declaration.weekdayList.length > 0 && !declaration.weekdayList.includes(weekday)) return '';
	const partFrom = part.hourFrom * 60;
	const partTo = part.hourTo * 60;
	let overlap = 0;
	for (const [from, to] of windowListOf(declaration)) overlap += Math.max(0, Math.min(to, partTo) - Math.max(from, partFrom));
	if (overlap <= 0) return '';
	return overlap >= partTo - partFrom ? 'full' : 'partial';
}

// what "current" is to the calendar: with an end, a declaration from the day it was said to that
// end; without one, only the status
function currentDeclarationOf(availability) {
	const current = availability.current;
	if (!current?.until) return null;
	const dayFrom = zeneDayOfTime(current.timeDeclared);
	const dayTo = zeneDayOf(current.until);
	if (Number.isNaN(dayTo)) return null;
	return zeneDeclarationNormalize({
		id: 'current', state: current.state, note: current.note, timeDeclared: current.timeDeclared,
		span: { unit: 'range', from: zeneDayText(Number.isNaN(dayFrom) ? dayTo : Math.min(dayFrom, dayTo)), to: current.until },
	});
}

// --- merging ------------------------------------------------------------------------------------

// Every part of every day from dayFrom, for dayCount days, with the state the declarations give
// it: { dayList: [{ day, text, weekday, partList: [{ dayPart, state, declarationId, isPartial }] }],
// winCountById, coverCountById }. state '' where nothing is declared.
export function zeneAvailabilityResolve(availability, { dayFrom, dayCount, dayPartList = ZENE_DAY_PART_SHOWN_LIST }) {
	const current = currentDeclarationOf(availability);
	const candidateList = [...availability.declarationList, ...(current ? [current] : [])]
		.map((declaration, order) => ({ declaration, order, range: zeneSpanDayRange(declaration.span), cover: zeneDeclarationCoverHours(declaration) }))
		.filter((one) => one.range);
	const winCountById = new Map();
	const coverCountById = new Map();
	const dayList = [];
	for (let day = dayFrom; day < dayFrom + dayCount; day += 1) {
		const weekday = zeneWeekdayOf(day);
		const partList = dayPartList.map((dayPart) => {
			const part = DAY_PART_BY_ID.get(dayPart);
			let best;
			let bestCover = '';
			for (const one of candidateList) {
				const cover = coverOf(one.declaration, one.range, day, weekday, part);
				if (!cover) continue;
				coverCountById.set(one.declaration.id, (coverCountById.get(one.declaration.id) ?? 0) + 1);
				if (!best || winsOver(one, best)) { best = one; bestCover = cover; }
			}
			if (!best) return { dayPart, state: '', declarationId: '', isPartial: false };
			winCountById.set(best.declaration.id, (winCountById.get(best.declaration.id) ?? 0) + 1);
			return { dayPart, state: best.declaration.state, declarationId: best.declaration.id, isPartial: bestCover === 'partial' };
		});
		dayList.push({ day, text: zeneDayText(day), weekday, partList });
	}
	return { dayList, winCountById, coverCountById };
}

// the more specific wins; as specific: the later declared; declared at once: the later in the list
function winsOver(one, other) {
	if (one.cover !== other.cover) return one.cover < other.cover;
	const time = one.declaration.timeDeclared.localeCompare(other.declaration.timeDeclared);
	if (time !== 0) return time > 0;
	return one.order > other.order;
}

// The overall picture, for the homepage (doc/zene-availability.md#the-report): the status (the
// current declaration, or what the next two weeks say), the share of each state over a horizon,
// the usual free times, the next free times, and what each declaration decides in it.
export function zeneAvailabilityReport(availability, { time, weekCount = 8 }) {
	const today = zeneDayOfTime(time);
	const dayFrom = zeneWeekStartOf(today);
	const dayCount = weekCount * 7;
	const resolved = zeneAvailabilityResolve(availability, { dayFrom, dayCount });
	const countByState = { available: 0, limited: 0, unavailable: 0, '': 0 };
	const usualCount = new Map();
	for (const one of resolved.dayList) {
		for (const part of one.partList) {
			countByState[part.state] += 1;
			if (part.state === 'available' && one.day >= today) {
				const key = `${one.weekday}:${part.dayPart}`;
				usualCount.set(key, (usualCount.get(key) ?? 0) + 1);
			}
		}
	}
	// usual: a part of a weekday free in most of the weeks ahead
	const weekAheadCount = Math.max(1, Math.floor((dayFrom + dayCount - today) / 7));
	const usualList = [];
	for (const weekday of WEEKDAY_ID_LIST) {
		const partList = ZENE_DAY_PART_SHOWN_LIST.filter((dayPart) => (usualCount.get(`${weekday}:${dayPart}`) ?? 0) >= weekAheadCount * 0.6);
		if (partList.length > 0) usualList.push({ weekday, partList });
	}
	// the next free times: runs of free parts, from today
	const nextFreeList = [];
	for (const one of resolved.dayList) {
		if (one.day < today || nextFreeList.length >= 3) continue;
		const partFreeList = one.partList.filter((part) => part.state === 'available').map((part) => part.dayPart);
		if (partFreeList.length > 0) nextFreeList.push({ day: one.day, text: one.text, weekday: one.weekday, partList: partFreeList });
	}
	// the status: what the person said, while it holds; else what the next two weeks say
	const current = availability.current;
	const isCurrentOver = Boolean(current?.until) && zeneDayOf(current.until) < today;
	let statusState;
	let statusSource;
	if (current && !isCurrentOver) {
		statusState = current.state;
		statusSource = 'current';
	} else {
		const soonList = resolved.dayList.filter((one) => one.day >= today && one.day < today + 14).flatMap((one) => one.partList);
		const freeCount = soonList.filter((part) => part.state === 'available').length;
		const knownCount = soonList.filter((part) => part.state).length;
		statusState = knownCount === 0 ? '' : freeCount >= soonList.length / 4 ? 'available' : freeCount > 0 || soonList.some((part) => part.state === 'limited') ? 'limited' : 'unavailable';
		statusSource = knownCount === 0 ? 'none' : 'declared';
	}
	const declarationList = availability.declarationList.map((declaration) => ({
		declaration,
		coverHours: zeneDeclarationCoverHours(declaration),
		winCount: resolved.winCountById.get(declaration.id) ?? 0,
		coverCount: resolved.coverCountById.get(declaration.id) ?? 0,
	})).map((one) => ({ ...one, isOverridden: one.coverCount > 0 && one.winCount === 0, isOutOfView: one.coverCount === 0 }));
	return {
		today, dayFrom, dayCount, resolved, countByState, usualList, nextFreeList, declarationList,
		status: { state: statusState, source: statusSource, current: current && !isCurrentOver ? current : null, isCurrentOver },
	};
}

// --- words --------------------------------------------------------------------------------------

const weekdayLabel = (id) => ZENE_WEEKDAY_LIST.find((one) => one.id === id)?.label ?? id;

// "Sat, Sun" | "weekdays" | "weekends"; '' for every day
export function zeneWeekdayListText(weekdayList) {
	const set = new Set(weekdayList);
	if (set.size === 0 || set.size === 7) return '';
	if (set.size === 5 && ['mon', 'tue', 'wed', 'thu', 'fri'].every((one) => set.has(one))) return 'weekdays';
	if (set.size === 2 && set.has('sat') && set.has('sun')) return 'weekends';
	return WEEKDAY_ID_LIST.filter((one) => set.has(one)).map(weekdayLabel).join(', ');
}

// "morning–afternoon" for parts next to each other, "morning, evening" otherwise
export function zeneDayPartListText(dayPartList) {
	const order = ZENE_DAY_PART_LIST.map((one) => one.id);
	const sorted = [...new Set(dayPartList)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
	if (sorted.length === 0) return '';
	const isRun = sorted.every((one, index) => index === 0 || order.indexOf(one) === order.indexOf(sorted[index - 1]) + 1);
	const label = (id) => DAY_PART_BY_ID.get(id).label.toLowerCase();
	return isRun && sorted.length > 1 ? `${label(sorted[0])}–${label(sorted.at(-1))}` : sorted.map(label).join(', ');
}

// what a span says, for a person: "always", "2027", "spring 2027", "January 2027", "week 3 of 2027",
// "2027-01-24 +09", "2026-12-28 – 2027-01-03 +09"
export function zeneSpanText(span, zone = '') {
	const zoneText = zone ? ` ${zone}` : '';
	const value = String(span?.value ?? '');
	switch (span?.unit) {
		case 'always': return 'always';
		case 'year': return value;
		case 'season': {
			const [year, season] = value.split('-');
			const one = ZENE_SEASON_LIST.find((item) => item.id === season);
			return one ? `${one.label.toLowerCase()} ${year} (${MONTH_LABEL_LIST[one.monthFrom - 1]}–${MONTH_LABEL_LIST[(one.monthFrom + 1) % 12]})` : value;
		}
		case 'month': {
			const [year, month] = value.split('-');
			return MONTH_NAME_LIST[Number(month) - 1] ? `${MONTH_NAME_LIST[Number(month) - 1]} ${year}` : value;
		}
		case 'week': {
			const range = zeneSpanDayRange(span);
			return range ? `the week of ${zeneDayText(range.dayFrom).slice(5)} – ${zeneDayText(range.dayTo).slice(5)}${zoneText}` : value;
		}
		case 'day': return `${value}${zoneText}`;
		case 'range': return `${span.from} – ${span.to}${zoneText}`;
		default: return '';
	}
}

// a declaration in one line: "every Sat · afternoon", "August 2027", "2026-12-24 +09 · evening",
// "every Wed · 19:30–22:00 +09"
export function zeneDeclarationText(declaration, zone = '') {
	const dayText = zeneWeekdayListText(declaration.weekdayList);
	const whenText = declaration.span.unit === 'always'
		? (dayText ? `every ${dayText.replace(/^weekdays$/, 'weekday').replace(/^weekends$/, 'weekend')}` : 'every day')
		: `${zeneSpanText(declaration.span, zone)}${dayText ? `, ${dayText}` : ''}`;
	const hourText = declaration.hourFrom || declaration.hourTo ? `${declaration.hourFrom}–${declaration.hourTo}${zone ? ` ${zone}` : ''}` : zeneDayPartListText(declaration.dayPartList);
	return hourText ? `${whenText} · ${hourText}` : whenText;
}

export function zeneMonthLabel(day) {
	return MONTH_LABEL_LIST[new Date(day * DAY_MS).getUTCMonth()];
}
