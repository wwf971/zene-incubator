// The cartoon icons of the tags (doc/zene-ui.md#icons): drawn in one hand, a dark ink outline over
// flat fills with a soft highlight, on a round sticker. A tag names its icon by id (`icon: violin`);
// a tag without one is drawn with its nearest parent's. Every icon is a 48 x 48 drawing.
//
//   <ZeneIcon name="violin" size={28} color="#f4a261" isSticker />

export const ZENE_INK = '#2d2440';
const W = 2.2;
const line = { fill: 'none', stroke: ZENE_INK, strokeWidth: W, strokeLinecap: 'round', strokeLinejoin: 'round' };
const fill = (color) => ({ fill: color, stroke: ZENE_INK, strokeWidth: W, strokeLinejoin: 'round' });
const thin = (color = ZENE_INK, width = 1.2) => ({ fill: 'none', stroke: color, strokeWidth: width, strokeLinecap: 'round' });
const shine = { fill: '#ffffff', opacity: 0.55 };

// a tube drawn as an outline and a fill along one path: the brass and the woodwinds
function Tube({ d, color, width = 6 }) {
	return (
		<>
			<path d={d} fill="none" stroke={ZENE_INK} strokeWidth={width + W * 2} strokeLinecap="round" strokeLinejoin="round" />
			<path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
		</>
	);
}

// the body of a bowed string instrument, scaled about its middle: violin, viola, cello, bass
function Bowed({ scale = 1, color = '#f4a261', isBow = false, isEndpin = false, isSloped = false, shiftY = 0 }) {
	const body = isSloped
		? 'M24 15 C27 15 28 18 29.5 21 C31 24 29 27 29 29.5 C29 31.5 33 33 32.6 37.6 C32.2 41.6 28 43 24 43 C20 43 15.8 41.6 15.4 37.6 C15 33 19 31.5 19 29.5 C19 27 17 24 18.5 21 C20 18 21 15 24 15 Z'
		: 'M24 17 C29 17 31.5 19 31 23 C30.6 26 28.5 27.5 28.6 29.5 C28.7 31.5 32.8 33 32.5 37.5 C32.2 41.5 28 43 24 43 C20 43 15.8 41.5 15.5 37.5 C15.2 33 19.3 31.5 19.4 29.5 C19.5 27.5 17.4 26 17 23 C16.5 19 19 17 24 17 Z';
	return (
		<g transform={`translate(24 ${26 + shiftY}) scale(${scale}) translate(-24 -26)`}>
			{isBow ? (
				<>
					<path d="M11 8 L41 40" {...thin(ZENE_INK, 2)} />
					<path d="M13.5 7 L42.5 38" {...thin('#fefae0', 1)} />
					<rect x="38.5" y="36.5" width="4" height="3" rx="1" transform="rotate(45 40.5 38)" {...fill('#2d2440')} />
				</>
			) : null}
			{isEndpin ? <path d="M24 42 L24 48" {...line} /> : null}
			<rect x="22.4" y="3.5" width="3.2" height="15" rx="1.4" {...fill('#6b4226')} />
			<circle cx="24" cy="4" r="2.6" {...fill('#6b4226')} />
			<path d={body} {...fill(color)} />
			<path d="M20.4 28.5 q-1 2.5 0 5.5 M27.6 28.5 q1 2.5 0 5.5" {...thin(ZENE_INK, 1.3)} />
			<path d="M24 19 L24 38.5" {...thin('#fffaf0', 0.9)} />
			<path d="M22.3 37.5 h3.4 l-0.5 4.2 h-2.4 z" fill={ZENE_INK} />
			<ellipse cx="20.6" cy="21.5" rx="1.9" ry="3" {...shine} />
		</g>
	);
}

const ICON_BY_NAME = {
	note: () => (
		<>
			<path d="M25 33 V9 c5 3 11 5 10 13" {...line} />
			<ellipse cx="19" cy="33" rx="7.4" ry="5.6" transform="rotate(-22 19 33)" {...fill('#ffd166')} />
			<ellipse cx="16.6" cy="31.6" rx="2.2" ry="1.3" transform="rotate(-22 16.6 31.6)" {...shine} />
		</>
	),
	jam: () => (
		<>
			<path d="M17 34 V14 L37 9 V29" {...line} />
			<path d="M17 18 L37 13" {...line} />
			<ellipse cx="12.5" cy="34" rx="5.6" ry="4.4" transform="rotate(-20 12.5 34)" {...fill('#ffafcc')} />
			<ellipse cx="32.5" cy="29" rx="5.6" ry="4.4" transform="rotate(-20 32.5 29)" {...fill('#a2d2ff')} />
		</>
	),
	violin: () => <Bowed isBow color="#f4a261" />,
	viola: () => <Bowed isBow color="#e07a5f" scale={1.06} />,
	cello: () => <Bowed isEndpin color="#c8814c" scale={1.08} shiftY={-1.5} />,
	doublebass: () => <Bowed isEndpin isSloped color="#9c6644" scale={1.1} shiftY={-1.5} />,
	guitar: () => (
		<g transform="rotate(32 24 26)">
			<rect x="22.3" y="2.5" width="3.4" height="15" rx="1" {...fill('#8d5524')} />
			<rect x="20.8" y="0.8" width="6.4" height="5" rx="1.6" {...fill('#5e3a1c')} />
			<path d="M24 13 C30 13 32 17 31 21 C30.3 24 29 25 30 27 C34 29 35 33 34 37 C33 42 28.5 45 24 45 C19.5 45 15 42 14 37 C13 33 14 29 18 27 C19 25 17.7 24 17 21 C16 17 18 13 24 13 Z" {...fill('#f6bd60')} />
			<circle cx="24" cy="28" r="3.8" fill={ZENE_INK} />
			<rect x="20" y="36" width="8" height="2.4" rx="1" fill={ZENE_INK} />
			<ellipse cx="19.5" cy="19" rx="1.8" ry="3" {...shine} />
		</g>
	),
	bassguitar: () => (
		<g transform="rotate(32 24 26)">
			<rect x="22.5" y="1" width="3" height="22" rx="1" {...fill('#8d5524')} />
			<rect x="21" y="0" width="6" height="4.4" rx="1.4" {...fill('#5e3a1c')} />
			<path d="M24 22 C28 22 29 18 32 19 C35 20 32 26 33 30 C34.5 36 34 44 24 44 C14 44 13.5 36 15 30 C16 26 14 22 17 21 C20 20 20 22 24 22 Z" {...fill('#4cc9f0')} />
			<path d="M19 29 C21 27 27 27 29 29 L28 38 C26 40 22 40 20 38 Z" {...fill('#fefae0')} />
			<rect x="20.6" y="31" width="6.8" height="2.2" rx="1" fill={ZENE_INK} />
		</g>
	),
	harp: () => (
		<>
			<path d="M13 44 L13 9 Q25 1 38 13 L17 44 Z" {...fill('#f7d794')} />
			<path d="M18 6.6 L18 42.6 M22 5.6 L22 36.8 M26 6.4 L26 30.8 M30 8.4 L30 24.9 M34 10.8 L34 19" {...thin(ZENE_INK, 1)} />
			<path d="M13 44 L13 9" {...line} strokeWidth={4.4} />
			<path d="M13 44 L13 9" fill="none" stroke="#c9963d" strokeWidth={2.2} strokeLinecap="round" />
			<rect x="10" y="42" width="11" height="3.5" rx="1.5" {...fill('#c9963d')} />
		</>
	),
	piano: () => (
		<>
			<rect x="5" y="11" width="38" height="28" rx="6" {...fill('#8ecae6')} />
			<rect x="17" y="13.5" width="14" height="6" rx="1" {...fill('#ffffff')} />
			<path d="M19.5 15.5 h9 M19.5 17.5 h9" {...thin(ZENE_INK, 0.8)} />
			<rect x="8.5" y="22" width="31" height="13.5" rx="1.5" {...fill('#ffffff')} />
			<path d="M12.9 22 V35.5 M17.4 22 V35.5 M21.8 22 V35.5 M26.2 22 V35.5 M30.6 22 V35.5 M35.1 22 V35.5" {...thin(ZENE_INK, 1)} />
			{[11.4, 15.8, 24.6, 29, 33.5].map((x) => <rect key={x} x={x} y="22" width="2.8" height="7.5" rx="0.6" fill={ZENE_INK} />)}
			<ellipse cx="10" cy="14.5" rx="2.6" ry="1.3" {...shine} />
		</>
	),
	synth: () => (
		<>
			<rect x="4" y="13" width="40" height="24" rx="5" {...fill('#b8c0ff')} />
			{[10, 17, 24].map((x) => <circle key={x} cx={x} cy="19.5" r="2.6" {...fill('#ffd166')} />)}
			<rect x="30" y="17" width="9" height="5" rx="1.5" {...fill('#2d2440')} />
			<rect x="7" y="25.5" width="34" height="8.5" rx="1.2" {...fill('#ffffff')} />
			<path d="M11.9 25.5 V34 M16.7 25.5 V34 M21.6 25.5 V34 M26.4 25.5 V34 M31.3 25.5 V34 M36.1 25.5 V34" {...thin(ZENE_INK, 1)} />
		</>
	),
	flute: () => (
		<g transform="rotate(-28 24 24)">
			<Tube d="M3 24 L45 24" color="#e3e8ef" width={5.5} />
			<ellipse cx="9" cy="24" rx="2.2" ry="1.4" fill={ZENE_INK} />
			{[18, 23, 28, 33, 38].map((x) => <circle key={x} cx={x} cy="24" r="1.7" {...fill('#c0c9d6')} strokeWidth={1.1} />)}
			<path d="M5 22.3 H41" {...thin('#ffffff', 1.1)} />
		</g>
	),
	clarinet: () => (
		<g transform="rotate(28 24 24)">
			<Tube d="M24 7 L24 36" color="#3d3d5c" width={6} />
			<path d="M20.5 7 L27.5 7 L26 2 L22 2 Z" {...fill('#2d2440')} />
			<path d="M20 36 L28 36 L32.5 45 L15.5 45 Z" {...fill('#3d3d5c')} />
			{[12, 17, 22, 27, 32].map((y) => <rect key={y} x="22.2" y={y} width="3.6" height="1.6" rx="0.6" fill="#d9e1ea" />)}
		</g>
	),
	sax: () => (
		<>
			<Tube d="M14 6 Q20 6 21 12 L21 33 Q21 41 28 41 Q34 41 34 33 L34 27" color="#f9c74f" width={6.5} />
			<ellipse cx="35.2" cy="23.6" rx="6.4" ry="3.8" transform="rotate(-18 35.2 23.6)" {...fill('#f9c74f')} />
			<ellipse cx="35.2" cy="23.6" rx="3.6" ry="1.8" transform="rotate(-18 35.2 23.6)" fill="#b7791f" />
			{[17, 22, 27].map((y) => <circle key={y} cx="21" cy={y} r="1.7" {...fill('#fffaf0')} strokeWidth={1.1} />)}
			<path d="M11 5.5 L15 6.5" {...line} />
		</>
	),
	trumpet: () => (
		<>
			<Tube d="M5 25 L31 25" color="#f9c74f" width={4} />
			<Tube d="M13 25 Q12 33 19 33 L29 33 Q33 33 33 29" color="#f9c74f" width={4} />
			<path d="M30 21 L42 14.5 Q45.5 26 42 37.5 L30 30 Z" {...fill('#f9c74f')} />
			{[15.5, 20, 24.5].map((x) => <rect key={x} x={x} y="16" width="3.2" height="7" rx="1" {...fill('#f9c74f')} strokeWidth={1.6} />)}
			{[15.5, 20, 24.5].map((x) => <rect key={`c${x}`} x={x - 0.6} y="14.2" width="4.4" height="2.2" rx="1" fill={ZENE_INK} />)}
			<path d="M3.5 23 L3.5 27" {...line} strokeWidth={3} />
			<path d="M34 20.5 L40 17.5" {...thin('#ffffff', 1.3)} />
		</>
	),
	horn: () => (
		<>
			<Tube d="M22 37 A11 11 0 1 1 33 26" color="#f9c74f" width={4.6} />
			<Tube d="M22 31 A5.5 5.5 0 1 1 27.5 25.5" color="#f9c74f" width={3} />
			<path d="M31 27 L43 34 Q41 44 33 44 L28 33 Z" {...fill('#f9c74f')} />
			<path d="M33 41 Q37 41 40 36" {...thin('#b7791f', 1.6)} />
			<path d="M9 16 L13 19" {...line} strokeWidth={3} />
		</>
	),
	trombone: () => (
		<>
			<Tube d="M30 31 L6 31 Q3 34.5 6 38 L30 38" color="#f9c74f" width={3.4} />
			<Tube d="M30 31 L30 22 L16 22" color="#f9c74f" width={3.4} />
			<path d="M28 18 L42 11 Q45.5 22 42 33 L28 26 Z" {...fill('#f9c74f')} />
			<path d="M33 16 L39 13.5" {...thin('#ffffff', 1.3)} />
			<path d="M13.5 20 L13.5 24" {...line} strokeWidth={3} />
		</>
	),
	tuba: () => (
		<>
			<path d="M14 41 Q11 27 18 19 L18 13 L30 13 L30 19 Q37 27 34 41 Z" {...fill('#f9c74f')} />
			<ellipse cx="24" cy="10" rx="11" ry="4" {...fill('#f9c74f')} />
			<ellipse cx="24" cy="10" rx="6.5" ry="2" fill="#b7791f" />
			{[28, 33].map((y) => <circle key={y} cx="33" cy={y} r="2.1" {...fill('#fffaf0')} strokeWidth={1.3} />)}
			<path d="M17 25 Q15 31 17 37" {...thin('#ffffff', 1.6)} />
			<path d="M10 33 L14 33" {...line} strokeWidth={3} />
		</>
	),
	drum: () => (
		<>
			<path d="M11 5 L25 19 M37 5 L23 19" {...line} strokeWidth={2.6} />
			<circle cx="11" cy="5" r="2" {...fill('#fefae0')} />
			<circle cx="37" cy="5" r="2" {...fill('#fefae0')} />
			<path d="M8 22 L8 35 Q24 42 40 35 L40 22 Z" {...fill('#e5989b')} />
			<path d="M12 24 L18 37 L24 25 L30 38 L36 24" {...thin('#fefae0', 1.5)} />
			<ellipse cx="24" cy="22" rx="16" ry="5.2" {...fill('#fefae0')} />
			<path d="M8 35 Q24 42 40 35" {...thin(ZENE_INK, 2.6)} />
		</>
	),
	timpani: () => (
		<>
			<path d="M15 38 L11 45 M33 38 L37 45 M24 40 L24 45" {...line} />
			<path d="M8 19 L40 19 Q40 39 24 41 Q8 39 8 19 Z" {...fill('#d4a373')} />
			<path d="M13 23 Q16 33 23 36" {...thin('#ffffff', 1.6)} />
			<ellipse cx="24" cy="19" rx="16" ry="4.6" {...fill('#fefae0')} />
			<path d="M33 3 L27 16" {...line} strokeWidth={2.4} />
			<circle cx="33.5" cy="3.5" r="3" {...fill('#ffafcc')} />
		</>
	),
	xylophone: () => (
		<>
			<path d="M6 40 L42 30 M6 22 L42 16" {...line} />
			{['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#bdb2ff'].map((color, index) => {
				const x = 8 + index * 5.6;
				const top = 21.2 - index * 1.1;
				const bottom = 40.5 - index * 2.1;
				return <rect key={color} x={x} y={top} width="4.6" height={bottom - top} rx="1.2" {...fill(color)} strokeWidth={1.6} />;
			})}
			<path d="M30 3 L36 12" {...line} />
			<circle cx="29" cy="2.8" r="2.4" {...fill('#ffafcc')} />
		</>
	),
	metronome: () => (
		<>
			<path d="M14 43 L19 7 L29 7 L34 43 Z" {...fill('#cdb4db')} />
			<path d="M17.5 32 L30.5 32" {...thin(ZENE_INK, 1.4)} />
			<path d="M24 36 L31 12" {...line} />
			<rect x="27" y="17" width="5" height="4" rx="1" transform="rotate(16 29.5 19)" {...fill('#ffd166')} />
			<rect x="11" y="41" width="26" height="4" rx="1.6" {...fill('#9d8189')} />
		</>
	),
	mic: () => (
		<>
			<rect x="17.5" y="4" width="13" height="21" rx="6.5" {...fill('#cdb4db')} />
			<path d="M18 12 H30 M18 16.5 H30" {...thin(ZENE_INK, 1.1)} />
			<path d="M13 18 Q13 30 24 30 Q35 30 35 18" {...line} />
			<path d="M24 30 L24 40 M16 41 L32 41" {...line} />
			<ellipse cx="21.5" cy="9" rx="1.6" ry="2.6" {...shine} />
			<path d="M38 8 v7 c2 1 4 2 4 5" {...thin(ZENE_INK, 1.6)} />
			<ellipse cx="36.6" cy="15.4" rx="2.2" ry="1.6" fill={ZENE_INK} />
		</>
	),
	choir: () => (
		<>
			<path d="M3 46 Q4 34 13 33 Q22 34 23 46 Z" {...fill('#cdb4db')} />
			<path d="M25 46 Q26 34 35 33 Q44 34 45 46 Z" {...fill('#a2d2ff')} />
			<path d="M13 46 Q14 31 24 30 Q34 31 35 46 Z" {...fill('#ffafcc')} />
			<circle cx="13" cy="25" r="6.5" {...fill('#f9d7b5')} />
			<circle cx="35" cy="25" r="6.5" {...fill('#e0ac69')} />
			<circle cx="24" cy="20" r="7" {...fill('#f1c27d')} />
			<ellipse cx="13" cy="27.5" rx="1.6" ry="2" fill={ZENE_INK} />
			<ellipse cx="35" cy="27.5" rx="1.6" ry="2" fill={ZENE_INK} />
			<ellipse cx="24" cy="22.5" rx="1.8" ry="2.2" fill={ZENE_INK} />
			<path d="M38 4 v7 M38 4 l5 -1.5 v7" {...thin(ZENE_INK, 1.6)} />
			<ellipse cx="36.6" cy="11" rx="2" ry="1.5" fill={ZENE_INK} />
			<ellipse cx="41.6" cy="9.5" rx="2" ry="1.5" fill={ZENE_INK} />
		</>
	),
	baton: () => (
		<>
			<path d="M12 37 L37 9" {...line} strokeWidth={2.8} />
			<path d="M12 37 L37 9" {...thin('#ffffff', 1)} />
			<ellipse cx="11" cy="38.5" rx="4" ry="5" transform="rotate(42 11 38.5)" {...fill('#e9c46a')} />
			<path d="M28 4 q4 0 6 -2 M40 13 q2 3 5 4 M38 19 q3 1 5 0" {...thin(ZENE_INK, 1.6)} />
			<path d="M36 26 l1.2 2.6 2.8 0.4 -2 2 0.5 2.8 -2.5 -1.3 -2.5 1.3 0.5 -2.8 -2 -2 2.8 -0.4 z" {...fill('#ffd166')} strokeWidth={1.3} />
		</>
	),
	score: () => (
		<g transform="rotate(-5 24 24)">
			<path d="M10 5 H32 L39 12 V43 H10 Z" {...fill('#ffffff')} />
			<path d="M32 5 V12 H39" {...fill('#e9ecef')} />
			<path d="M14 15 H35 M14 18 H35 M14 21 H35 M14 28 H35 M14 31 H35 M14 34 H35" {...thin('#8d99ae', 1)} />
			<ellipse cx="19" cy="20.6" rx="2" ry="1.5" fill={ZENE_INK} />
			<path d="M20.8 20.6 V13.5" {...thin(ZENE_INK, 1.2)} />
			<ellipse cx="28" cy="17.4" rx="2" ry="1.5" fill={ZENE_INK} />
			<path d="M29.8 17.4 V11" {...thin(ZENE_INK, 1.2)} />
			<ellipse cx="22" cy="33.4" rx="2" ry="1.5" fill={ZENE_INK} />
			<path d="M23.8 33.4 V26.5 L31.8 25 V31" {...thin(ZENE_INK, 1.2)} />
			<ellipse cx="30" cy="31" rx="2" ry="1.5" fill={ZENE_INK} />
		</g>
	),
	quill: () => (
		<>
			<path d="M37 4 C26 6 16 16 13 30 L17 31 C22 22 30 14 37 4 Z" {...fill('#a2d2ff')} />
			<path d="M37 4 L12 36" {...thin(ZENE_INK, 1.4)} />
			<path d="M13 30 L9 40 L12 36" {...line} />
			<path d="M6 44 H30" {...thin(ZENE_INK, 1.8)} />
			<path d="M20 22 l4 1 M24 16 l4 1" {...thin('#ffffff', 1.2)} />
		</>
	),
	composer: () => (
		<>
			<path d="M13 46 L15 34 Q24 30 33 34 L35 46 Z" {...fill('#bde0fe')} />
			<path d="M15 20 C10 20 10 12 15 11 C15 5 22 4 24 7 C26 4 33 5 33 11 C38 12 38 20 33 20 C35 26 32 30 30 29 L18 29 C16 30 13 26 15 20 Z" {...fill('#f8f9fa')} />
			<ellipse cx="24" cy="21" rx="6.5" ry="7.5" {...fill('#f9d7b5')} />
			<path d="M20.5 20 q1.2 1 2.4 0 M25.1 20 q1.2 1 2.4 0" {...thin(ZENE_INK, 1.3)} />
			<path d="M22 25 q2 1.2 4 0" {...thin(ZENE_INK, 1.3)} />
			<path d="M18 33.5 Q24 37 30 33.5" {...thin(ZENE_INK, 1.2)} />
		</>
	),
	star: () => (
		<>
			<path d="M24 4 L29.6 16.6 L43 17.8 L32.8 26.8 L35.9 40 L24 33 L12.1 40 L15.2 26.8 L5 17.8 L18.4 16.6 Z" {...fill('#ffd166')} />
			<ellipse cx="19" cy="20" rx="2" ry="3" {...shine} />
		</>
	),
	lyre: () => (
		<>
			<Tube d="M14 8 Q8 30 20 39 L28 39 Q40 30 34 8" color="#e9c46a" width={4} />
			<path d="M13 14 L35 14" {...line} strokeWidth={3} />
			<path d="M20 14.5 V38 M24 14.5 V38 M28 14.5 V38" {...thin(ZENE_INK, 1)} />
			<rect x="17" y="38" width="14" height="5" rx="2" {...fill('#c9963d')} />
		</>
	),
	gamepad: () => (
		<>
			<path d="M10 16 H38 C44 16 46 30 43 36 C41 40 36 39 33 34 L30 30 H18 L15 34 C12 39 7 40 5 36 C2 30 4 16 10 16 Z" {...fill('#90be6d')} />
			<path d="M12 21.5 V28.5 M8.5 25 H15.5" {...line} strokeWidth={3} />
			<circle cx="33" cy="22" r="2.4" {...fill('#ff6b6b')} />
			<circle cx="38" cy="26" r="2.4" {...fill('#4cc9f0')} />
			<path d="M21 23 h6" {...thin(ZENE_INK, 1.8)} />
			<ellipse cx="11" cy="18.8" rx="2.6" ry="1.2" {...shine} />
		</>
	),
	film: () => (
		<>
			<rect x="7" y="19" width="34" height="23" rx="2.5" {...fill('#3d3d5c')} />
			<path d="M12 27 H36 M12 32 H28 M12 37 H32" {...thin('#fefae0', 1.4)} />
			<g transform="rotate(-14 8 18)">
				<rect x="7" y="11" width="34" height="7" rx="1.5" {...fill('#fefae0')} />
				<path d="M12 11 L16 18 M20 11 L24 18 M28 11 L32 18 M36 11 L40 18" stroke={ZENE_INK} strokeWidth={2.4} />
			</g>
		</>
	),
	concert: () => (
		<>
			<path d="M3 4 Q8 22 4 42 L13 42 Q16 24 13 4 Z" {...fill('#ef476f')} />
			<path d="M45 4 Q40 22 44 42 L35 42 Q32 24 35 4 Z" {...fill('#ef476f')} />
			<path d="M18 4 L30 4 L36 38 L12 38 Z" fill="#fff3b0" opacity="0.9" />
			<path d="M3 4 H45" {...line} strokeWidth={3} />
			<path d="M6 42 H42" {...line} strokeWidth={2.8} />
			<path d="M25 34 V18 c3 2 7 3 7 8" {...line} />
			<ellipse cx="21" cy="34" rx="4.6" ry="3.5" transform="rotate(-20 21 34)" {...fill('#ffd166')} />
		</>
	),
	stand: () => (
		<>
			<path d="M24 28 L24 40 M24 40 L15 46 M24 40 L33 46 M24 40 L24 46" {...line} />
			<path d="M9 8 L39 8 L41 28 L7 28 Z" {...fill('#adb5bd')} />
			<path d="M13 6 L35 5 L36 24 L12 25 Z" {...fill('#ffffff')} />
			<path d="M15 11 H33 M15 14 H33 M15 19 H33 M15 22 H31" {...thin('#8d99ae', 0.9)} />
		</>
	),
	bulb: () => (
		<>
			<path d="M24 5 C33 5 38 12 37 19 C36 26 30 28 30 34 L18 34 C18 28 12 26 11 19 C10 12 15 5 24 5 Z" {...fill('#ffd166')} />
			<rect x="18" y="34" width="12" height="7" rx="2" {...fill('#adb5bd')} />
			<path d="M21 44 H27" {...line} />
			<path d="M20 22 L24 27 L28 22" {...thin(ZENE_INK, 1.4)} />
			<ellipse cx="18.5" cy="14" rx="2.2" ry="3.6" {...shine} />
		</>
	),
	group: () => (
		<>
			<circle cx="13" cy="19" r="6" {...fill('#ffd6a5')} />
			<circle cx="35" cy="19" r="6" {...fill('#caffbf')} />
			<path d="M2 40 Q3 28 13 28 Q20 28 22 33" {...fill('#ffadad')} />
			<path d="M46 40 Q45 28 35 28 Q28 28 26 33" {...fill('#9bf6ff')} />
			<path d="M11 44 Q12 30 24 30 Q36 30 37 44 Z" {...fill('#bdb2ff')} />
			<circle cx="24" cy="21" r="7" {...fill('#f9d7b5')} />
		</>
	),
};

export const ZENE_ICON_NAME_LIST = Object.keys(ICON_BY_NAME);

// an icon by name, on a round sticker of its color when isSticker
export function ZeneIcon({ name, size = 24, color = '', isSticker = false, title = '' }) {
	const draw = ICON_BY_NAME[name] ?? ICON_BY_NAME.note;
	const background = color || '#fff3d6';
	return (
		<svg className="zene-icon" width={size} height={size} viewBox={isSticker ? '-6 -6 60 60' : '0 0 48 48'} aria-hidden={title ? undefined : 'true'} role={title ? 'img' : undefined}>
			{title ? <title>{title}</title> : null}
			{isSticker ? (
				<>
					<circle cx="24" cy="26" r="28" fill={ZENE_INK} opacity="0.12" />
					<circle cx="24" cy="24" r="28" fill={background} stroke={ZENE_INK} strokeWidth="1.6" />
				</>
			) : null}
			{draw()}
		</svg>
	);
}
