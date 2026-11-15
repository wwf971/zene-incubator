// Ids of the entities (doc/zene-data.md#ids): self-assigned, never typed, 0-9 a-z with no
// meaning in them. The ms_48 form: the moment in ms in the high 48 bits, 16 random bits below,
// written in base 36, so ids made later sort later.

let offsetLast = -1;
let msLast = -1;

export function zeneIdNew(ms = Date.now()) {
	let offset = Math.floor(Math.random() * 0x10000);
	// two ids in the same ms never collide: the second takes the next offset
	if (ms === msLast && offset <= offsetLast) offset = (offsetLast + 1) & 0xffff;
	msLast = ms;
	offsetLast = offset;
	return ((BigInt(ms) << 16n) | BigInt(offset)).toString(36);
}

// an id is a word of 0-9 a-z
export function zeneIdIs(text) {
	return /^[0-9a-z]{4,16}$/.test(String(text ?? ''));
}
