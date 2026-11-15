// Times of the data items (doc/zene-data.md#times): a text of the project's format,
// 20261213_14000000+09, local time to 10 ms followed by the zone in whole hours. Every time is
// written with the zone it was made in, so an event in Tokyo reads 14:00 +09 wherever it is read.
// What is compared is the moment (ms); what is shown is the text, in its own zone
// (timeTextDisplay of react-doc).

const TIME_PATTERN = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(\d{2})?([+-]\d{2})$/;
const HOUR_MS = 3600 * 1000;
export const DAY_MS = 24 * HOUR_MS;

// the moment of a time text, in ms since the epoch; NaN for what is not one
export function zeneTimeMs(text) {
	const match = TIME_PATTERN.exec(String(text ?? ''));
	if (!match) return Number.NaN;
	const [, year, month, day, hour, minute, second, centi, zone] = match;
	const utc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), Number(centi ?? 0) * 10);
	return utc - Number(zone) * HOUR_MS;
}

// the zone of a time text in hours (+09 -> 9); the browser's when the text has none
export function zeneTimeZoneOf(text) {
	const match = TIME_PATTERN.exec(String(text ?? ''));
	if (match) return Number(match[8]);
	return -Math.round(new Date().getTimezoneOffset() / 60);
}

// a moment written in a zone (hours): 20261213_14000000+09
export function zeneTimeText(ms, zoneHour = zeneTimeZoneOf('')) {
	if (!Number.isFinite(ms)) return '';
	const date = new Date(ms + zoneHour * HOUR_MS);
	const pad = (value, length = 2) => String(value).padStart(length, '0');
	const zoneText = `${zoneHour < 0 ? '-' : '+'}${pad(Math.abs(zoneHour))}`;
	return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
		+ `_${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}${pad(Math.floor(date.getUTCMilliseconds() / 10))}`
		+ zoneText;
}

// now, in the browser's zone
export function zeneTimeNow() {
	return zeneTimeText(Date.now());
}

// a time text moved by some ms, kept in its zone
export function zeneTimeAdd(text, ms) {
	return zeneTimeText(zeneTimeMs(text) + ms, zeneTimeZoneOf(text));
}

// whether a period { timeStart, timeEnd } holds the moment `time` (an end left empty: still on)
export function zenePeriodHas(period, time) {
	const at = zeneTimeMs(time);
	const start = zeneTimeMs(period?.timeStart);
	const end = zeneTimeMs(period?.timeEnd);
	if (Number.isFinite(start) && at < start) return false;
	if (Number.isFinite(end) && at >= end) return false;
	return true;
}

// the value of an <input type="datetime-local"> (2026-12-13T14:00) as a time text in a zone, and back
export function zeneTimeFromLocalInput(value, zoneHour = zeneTimeZoneOf('')) {
	const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value ?? ''));
	if (!match) return '';
	const pad = (one) => String(one).padStart(2, '0');
	return `${match[1]}${match[2]}${match[3]}_${match[4]}${match[5]}0000${zoneHour < 0 ? '-' : '+'}${pad(Math.abs(zoneHour))}`;
}

export function zeneTimeToLocalInput(text) {
	const match = TIME_PATTERN.exec(String(text ?? ''));
	if (!match) return '';
	return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
}
