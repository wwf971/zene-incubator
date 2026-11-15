import { ZENE_INK, ZeneIcon } from './ZeneIcon.jsx';

// The picture of an account (doc/zene-ui.md#icons): a person is a cartoon face made from the seed of
// their avatar (skin, hair, its color), a group or an event a badge with its icon. Nothing is
// uploaded: the face is a function of the data, the same wherever it is drawn.
//
//   <ZeneAvatar account={account} size={40} />

const SKIN_LIST = ['#f9d7b5', '#f1c27d', '#e0ac69', '#c68642', '#a1665e', '#f3c6a5'];
const HAIR_COLOR_LIST = ['#2d2440', '#5b3a29', '#a0522d', '#e6b422', '#d1495b', '#3d5a80', '#6d6875'];
const BG_LIST = ['#ffd6e0', '#d0f4de', '#cde7ff', '#fff1c1', '#e2ece9', '#f1e3ff', '#ffe5d9', '#d8f3dc', '#e0e1dd', '#d7e3fc', '#ffeedd'];

function seedNumber(text) {
	let hash = 2166136261;
	for (const char of String(text ?? '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
	return hash >>> 0;
}

export function ZeneAvatar({ account, size = 40, isRing = false }) {
	if (!account) return <span className="zene-avatar is-empty" style={{ width: size, height: size }} aria-hidden="true" />;
	const avatar = account.avatar ?? {};
	const isFace = account.subject?.kind === 'individual' && avatar.style !== 'badge';
	const seed = seedNumber(avatar.seed || account.id);
	const background = avatar.color || BG_LIST[seed % BG_LIST.length];
	if (!isFace) {
		return (
			<span className={`zene-avatar is-badge${isRing ? ' is-ring' : ''}`} style={{ width: size, height: size, background }} title={account.name}>
				<ZeneIcon name={avatar.icon || (account.subject?.kind === 'event' ? 'concert' : 'group')} size={Math.round(size * 0.72)} />
			</span>
		);
	}
	return (
		<span className={`zene-avatar${isRing ? ' is-ring' : ''}`} style={{ width: size, height: size }} title={account.name}>
			<ZeneFace seed={seed} background={background} size={size} />
		</span>
	);
}

// a face: the shape of the hair and its color, the skin, all from the seed
export function ZeneFace({ seed, background, size }) {
	const skin = SKIN_LIST[seed % SKIN_LIST.length];
	const hair = HAIR_COLOR_LIST[Math.floor(seed / 7) % HAIR_COLOR_LIST.length];
	const style = Math.floor(seed / 53) % 5;
	const isGlasses = Math.floor(seed / 331) % 4 === 0;
	const stroke = { stroke: ZENE_INK, strokeWidth: 1.6, strokeLinejoin: 'round' };
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
			<circle cx="24" cy="24" r="24" fill={background} />
			{/* hair behind the head: long and bob */}
			{style === 1 ? <path d="M10 26 C9 12 16 8 24 8 C32 8 39 12 38 26 L40 44 L8 44 Z" fill={hair} {...stroke} /> : null}
			{style === 3 ? <path d="M11 30 C9 14 16 9 24 9 C32 9 39 14 37 30 L33 32 L15 32 Z" fill={hair} {...stroke} /> : null}
			<path d="M12 48 C12 38 17 35 24 35 C31 35 36 38 36 48 Z" fill="#ffffff" {...stroke} />
			<rect x="20.5" y="29" width="7" height="7" rx="2" fill={skin} {...stroke} />
			<ellipse cx="24" cy="23" rx="10.5" ry="11.5" fill={skin} {...stroke} />
			{/* hair over the head */}
			{style === 0 ? <path d="M13.5 21 C13 13 18 10 24 10 C31 10 35.5 13.5 34.5 21 C31 17 27 16 24 16.5 C20 17 16.5 18 13.5 21 Z" fill={hair} {...stroke} /> : null}
			{style === 1 ? <path d="M13.5 22 C13 13 18 10.5 24 10.5 C30 10.5 35 13 34.5 22 C30 16 22 15 13.5 22 Z" fill={hair} {...stroke} /> : null}
			{style === 2 ? (
				<>
					<circle cx="24" cy="8.5" r="5" fill={hair} {...stroke} />
					<path d="M13.5 20 C13.5 13 18 11 24 11 C30 11 34.5 13 34.5 20 C30 16.5 18 16.5 13.5 20 Z" fill={hair} {...stroke} />
				</>
			) : null}
			{style === 3 ? <path d="M13.5 22 C13 14 18 11 24 11 C30 11 35 14 34.5 22 L31 18 L27 21 L23 17.5 L18 21 Z" fill={hair} {...stroke} /> : null}
			{style === 4 ? <path d="M13 20 C11 15 14 10 18 11 C19 8 23 7 25 9 C28 7 33 9 33 12 C37 12 37.5 17 35 20 C31 17 18 17 13 20 Z" fill={hair} {...stroke} /> : null}
			<ellipse cx="20" cy="24" rx="1.4" ry="1.8" fill={ZENE_INK} />
			<ellipse cx="28" cy="24" rx="1.4" ry="1.8" fill={ZENE_INK} />
			{isGlasses ? <path d="M16.5 24 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0 M24.5 24 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0 M23.5 24 h1" fill="none" stroke={ZENE_INK} strokeWidth="1.2" /> : null}
			<ellipse cx="16.8" cy="28" rx="2.2" ry="1.3" fill="#ff8fab" opacity="0.55" />
			<ellipse cx="31.2" cy="28" rx="2.2" ry="1.3" fill="#ff8fab" opacity="0.55" />
			<path d="M21 29 Q24 31.6 27 29" fill="none" stroke={ZENE_INK} strokeWidth="1.5" strokeLinecap="round" />
		</svg>
	);
}
