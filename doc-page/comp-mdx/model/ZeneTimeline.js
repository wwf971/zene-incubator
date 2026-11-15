// The timeline under the relations of a community (doc/zene-timeline.md): a membership, a role, a
// skill, the life of a group, each holds from a time to a time, the end left open while it goes on.
//
//   a point     a time as precisely as it is known: a year ('2017'), a month ('2017-06'), a day
//               ('2017-06-04'), or a moment the app recorded ('20170604_19300000+09'). A point of a
//               month is some instant of that month, not its first day: the model keeps the
//               uncertainty instead of guessing an end of it
//   a period    { from, to }: from a point to a point; to '' while it goes on (until now)
//   at a time   a period holds 'yes', 'maybe' (the time falls in the uncertainty of one of its ends)
//               or 'no'; two periods overlap 'yes', 'maybe' or 'no'
//
// Dates are local dates in a zone (+09 unless said); a moment carries its own.

import { zeneTimeMs } from './ZeneTime.js';

const HOUR_MS = 3600 * 1000;
export const ZENE_POINT_PRECISION_LIST = ['year', 'month', 'day', 'moment'];
const MONTH_LABEL_LIST = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const zoneHourOf = (zone) => {
	const match = /^([+-])(\d{2})$/.exec(String(zone ?? ''));
	return match ? Number(`${match[1]}${match[2]}`) : 9;
};
const localMs = (year, month, day, zoneHour) => Date.UTC(year, month - 1, day) - zoneHour * HOUR_MS;

// what a point may denote: { precision, text, msFrom, msTo } (the instant lies in [msFrom, msTo));
// undefined for a text that is no point
export function zenePointParse(text, zone = '+09') {
	const value = String(text ?? '').trim();
	const zoneHour = zoneHourOf(zone);
	let match = /^(\d{4})$/.exec(value);
	if (match) {
		const year = Number(match[1]);
		return { precision: 'year', text: value, msFrom: localMs(year, 1, 1, zoneHour), msTo: localMs(year + 1, 1, 1, zoneHour) };
	}
	match = /^(\d{4})-(\d{2})$/.exec(value);
	if (match) {
		const [year, month] = [Number(match[1]), Number(match[2])];
		if (month < 1 || month > 12) return undefined;
		return { precision: 'month', text: value, msFrom: localMs(year, month, 1, zoneHour), msTo: localMs(year, month + 1, 1, zoneHour) };
	}
	match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (match) {
		const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
		const msFrom = localMs(year, month, day, zoneHour);
		if (new Date(msFrom + zoneHour * HOUR_MS).getUTCDate() !== day) return undefined;
		return { precision: 'day', text: value, msFrom, msTo: msFrom + 24 * HOUR_MS };
	}
	const ms = zeneTimeMs(value);
	// a moment the app recorded is exact: nothing uncertain about it
	if (Number.isFinite(ms)) return { precision: 'moment', text: value, msFrom: ms, msTo: ms };
	return undefined;
}

// '' when a text is a point (or empty, where empty is allowed), else why not
export function zenePointCheck(text, { isEmptyAllowed = false } = {}) {
	if (!String(text ?? '').trim()) return isEmptyAllowed ? '' : 'say when';
	return zenePointParse(text) ? '' : `${text} is no time: write a year (2017), a month (2017-06) or a day (2017-06-04)`;
}

// a period as the model reads it: from and to as written, to '' while it goes on
export function zenePeriodNormalize(period) {
	return { from: String(period?.from ?? '').trim(), to: String(period?.to ?? '').trim() };
}

// '' when a period can be read and does not end before it starts
export function zenePeriodCheck(period) {
	const reason = zenePointCheck(period.from) || zenePointCheck(period.to, { isEmptyAllowed: true });
	if (reason) return reason;
	if (period.to && zenePointParse(period.to).msTo <= zenePointParse(period.from).msFrom) return `it ends (${period.to}) before it starts (${period.from})`;
	return '';
}

// a start nobody recorded: the period holds since before anything the app knows
const OPEN_START = { precision: 'open', text: '', msFrom: -Infinity, msTo: -Infinity };
const startOf = (period) => (period?.from ? zenePointParse(period.from) : OPEN_START);

// whether a period holds at a moment: 'yes' | 'maybe' | 'no'
export function zenePeriodAt(period, time) {
	const ms = typeof time === 'number' ? time : zeneTimeMs(time);
	const from = startOf(period);
	if (!from || !Number.isFinite(ms)) return 'no';
	if (ms < from.msFrom) return 'no';
	let answer = ms < from.msTo ? 'maybe' : 'yes';
	const to = period.to ? zenePointParse(period.to) : undefined;
	if (to) {
		if (ms >= to.msTo) return 'no';
		if (ms >= to.msFrom) answer = 'maybe';
	}
	return answer;
}

// whether a period holds now, as a yes or no: an uncertain edge counts as held only when asked
// (a membership holds through the month it ended in; a role managing a group holds only for sure)
export function zenePeriodHolds(period, time, { isMaybeHeld = false } = {}) {
	const answer = zenePeriodAt(period, time);
	return answer === 'yes' || (isMaybeHeld && answer === 'maybe');
}

// the instants a period surely and possibly covers: { msSureFrom, msSureTo, msMayFrom, msMayTo }
// (an open end is the moment asked about: now)
export function zenePeriodSpan(period, now) {
	const from = startOf(period);
	const to = period?.to ? zenePointParse(period.to) : undefined;
	const nowMs = typeof now === 'number' ? now : zeneTimeMs(now);
	if (!from) return undefined;
	return {
		msMayFrom: from.msFrom, msSureFrom: from.msTo,
		msSureTo: to ? to.msFrom : nowMs, msMayTo: to ? to.msTo : nowMs,
		isOpen: !to,
	};
}

// whether two periods overlap: 'yes' | 'maybe' | 'no'
export function zenePeriodOverlap(a, b, now) {
	const spanA = zenePeriodSpan(a, now);
	const spanB = zenePeriodSpan(b, now);
	if (!spanA || !spanB) return 'no';
	if (Math.max(spanA.msSureFrom, spanB.msSureFrom) < Math.min(spanA.msSureTo, spanB.msSureTo)) return 'yes';
	if (Math.max(spanA.msMayFrom, spanB.msMayFrom) < Math.min(spanA.msMayTo, spanB.msMayTo)) return 'maybe';
	return 'no';
}

// whether one period lies within another (a role within its membership): 'no' when it surely
// starts before the other may start or surely ends after the other may end
export function zenePeriodWithin(inner, outer, now) {
	const a = zenePeriodSpan(inner, now);
	const b = zenePeriodSpan(outer, now);
	if (!a || !b) return 'no';
	if (a.msSureFrom < b.msMayFrom || a.msSureTo > b.msMayTo) return 'no';
	return a.msMayFrom >= b.msSureFrom && a.msMayTo <= b.msSureTo ? 'yes' : 'maybe';
}

// a point as a person reads it: '2017', 'Jun 2017', '2017-06-04 +09' (a day, a moment: its date)
export function zenePointText(text, zone = '+09') {
	const point = zenePointParse(text, zone);
	if (!point) return String(text ?? '');
	if (point.precision === 'year') return point.text;
	if (point.precision === 'month') return `${MONTH_LABEL_LIST[Number(point.text.slice(5, 7)) - 1]} ${point.text.slice(0, 4)}`;
	if (point.precision === 'day') return `${point.text} ${zone}`;
	const match = /^(\d{4})(\d{2})(\d{2})_\d+([+-]\d{2})$/.exec(point.text);
	return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}` : point.text;
}

// "Jun 2017 – now", "Apr 2016 – Mar 2025", "since 2001" (with isSince, for an open period)
export function zenePeriodText(period, { zone = '+09', isSince = false } = {}) {
	if (!period?.from) return '';
	if (!period.to) return isSince ? `since ${zenePointText(period.from, zone)}` : `${zenePointText(period.from, zone)} – now`;
	return `${zenePointText(period.from, zone)} – ${zenePointText(period.to, zone)}`;
}

// the day of a moment, as a point of the precision a person records history in
export function zenePointOfTime(time) {
	const match = /^(\d{4})(\d{2})(\d{2})_/.exec(String(time ?? ''));
	return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

// Bars laid out in lanes, so that no two that may overlap share one: [{ ...bar, lane }], laneCount.
// A bar is anything with a period; the order of the input decides who takes the first lanes.
export function zeneLaneLayout(barList, now) {
	const laneEndList = [];
	const outList = [];
	for (const bar of [...barList].sort((a, b) => (zenePeriodSpan(a.period, now)?.msMayFrom ?? 0) - (zenePeriodSpan(b.period, now)?.msMayFrom ?? 0))) {
		const span = zenePeriodSpan(bar.period, now);
		if (!span) continue;
		let lane = laneEndList.findIndex((end) => end <= span.msMayFrom);
		if (lane < 0) { lane = laneEndList.length; laneEndList.push(0); }
		laneEndList[lane] = span.msMayTo;
		outList.push({ ...bar, lane, span });
	}
	return { barList: outList, laneCount: laneEndList.length };
}
