import { useEffect, useRef } from 'react';

// Horizontal swipes on the simulated phone (doc/zene-ui.md#gestures). Several regions may lie inside
// one another (the views of a homepage inside a pushed screen inside a tab): a swipe belongs to the
// innermost region that can move the way the finger goes, so at the first view a swipe to the right
// goes back, and on a tab's root it goes to the next tab. A vertical move is left to the scrolling of
// the screen. Pointer events, so a mouse drags as a finger does; a horizontal wheel (two fingers on a
// trackpad) swipes too.
//
//   useZeneSwipe(ref, { canTake(direction), onDrag(dx), onEnd(dx, velocity), onWheelSwipe(direction) })
//     direction   'left' (the finger moves left: the next page) | 'right'

const gestureByPointer = new Map();
const MOVE_DECIDE = 8;

export function useZeneSwipe(ref, handler) {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;
	useEffect(() => {
		const element = ref.current;
		if (!element) return undefined;
		const onDown = (event) => {
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			if (event.target.closest?.('input, textarea, select, [data-zene-noswipe]')) return;
			const held = gestureByPointer.get(event.pointerId);
			if (held && held.timeStamp === event.timeStamp) return;
			gestureByPointer.set(event.pointerId, { timeStamp: event.timeStamp, x: event.clientX, y: event.clientY, owner: null, state: 'pending', lastX: event.clientX, lastTime: performance.now(), velocity: 0 });
		};
		const onMove = (event) => {
			const gesture = gestureByPointer.get(event.pointerId);
			if (!gesture) return;
			const dx = event.clientX - gesture.x;
			const dy = event.clientY - gesture.y;
			if (gesture.state === 'pending') {
				if (Math.abs(dx) < MOVE_DECIDE && Math.abs(dy) < MOVE_DECIDE) return;
				if (Math.abs(dy) > Math.abs(dx)) { gesture.state = 'vertical'; return; }
				const direction = dx < 0 ? 'left' : 'right';
				if (!handlerRef.current.canTake?.(direction)) return;
				gesture.state = 'owned';
				gesture.owner = element;
				try { element.setPointerCapture(event.pointerId); } catch { /* the pointer is gone */ }
				element.closest('.zene-phone')?.classList.add('is-dragging');
			}
			if (gesture.owner !== element) return;
			event.preventDefault();
			const now = performance.now();
			gesture.velocity = (event.clientX - gesture.lastX) / Math.max(1, now - gesture.lastTime);
			gesture.lastX = event.clientX;
			gesture.lastTime = now;
			handlerRef.current.onDrag?.(dx);
		};
		const onUp = (event) => {
			const gesture = gestureByPointer.get(event.pointerId);
			if (!gesture) return;
			if (gesture.owner && gesture.owner !== element) return;
			gestureByPointer.delete(event.pointerId);
			if (gesture.owner !== element) return;
			element.closest('.zene-phone')?.classList.remove('is-dragging');
			// the click that ends a drag is not a tap
			const clickStop = (one) => { one.stopPropagation(); one.preventDefault(); };
			window.addEventListener('click', clickStop, { capture: true, once: true });
			setTimeout(() => window.removeEventListener('click', clickStop, { capture: true }), 0);
			handlerRef.current.onEnd?.(event.type === 'pointercancel' ? 0 : event.clientX - gesture.x, gesture.velocity);
		};
		let wheelSum = 0;
		let wheelTime = 0;
		let wheelLock = 0;
		const onWheel = (event) => {
			if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || !handlerRef.current.onWheelSwipe) return;
			const direction = event.deltaX > 0 ? 'left' : 'right';
			if (!handlerRef.current.canTake?.(direction)) return;
			event.preventDefault();
			event.stopPropagation();
			const now = performance.now();
			if (now < wheelLock) return;
			if (now - wheelTime > 200) wheelSum = 0;
			wheelTime = now;
			wheelSum += event.deltaX;
			if (Math.abs(wheelSum) < 60) return;
			wheelSum = 0;
			wheelLock = now + 450;
			handlerRef.current.onWheelSwipe(direction);
		};
		element.addEventListener('pointerdown', onDown);
		element.addEventListener('pointermove', onMove);
		element.addEventListener('pointerup', onUp);
		element.addEventListener('pointercancel', onUp);
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => {
			element.removeEventListener('pointerdown', onDown);
			element.removeEventListener('pointermove', onMove);
			element.removeEventListener('pointerup', onUp);
			element.removeEventListener('pointercancel', onUp);
			element.removeEventListener('wheel', onWheel);
		};
	}, [ref]);
}

// Pages side by side, one shown, a swipe going to the next or the one before: the tabs of the app,
// the views of a homepage. The page shown is the caller's (index, onIndexChange: the store's); the
// drag itself moves the track directly, so nothing renders while a finger moves.
//
//   pageList   [{ id, render: () => node }]
//   isHeightFollow   the pager is as tall as the page shown (the views of a homepage, in a screen
//                    that scrolls), instead of filling its parent
export function ZenePager({ index, onIndexChange, pageList, className = '', isSwipeEnabled = true, isLazy = false, isHeightFollow = false }) {
	const rootRef = useRef(null);
	const trackRef = useRef(null);
	const count = pageList.length;
	const trackSet = (dx, isAnimated) => {
		const track = trackRef.current;
		if (!track) return;
		track.style.transition = isAnimated ? '' : 'none';
		track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
	};
	useZeneSwipe(rootRef, {
		canTake: (direction) => isSwipeEnabled && (direction === 'left' ? index < count - 1 : index > 0),
		onDrag: (dx) => {
			// past the first or the last page the track resists
			const isEdge = (dx > 0 && index === 0) || (dx < 0 && index === count - 1);
			trackSet(isEdge ? dx / 3 : dx, false);
		},
		onEnd: (dx, velocity) => {
			const width = rootRef.current?.clientWidth || 1;
			let next = index;
			if (dx < -width * 0.22 || velocity < -0.45) next = Math.min(count - 1, index + 1);
			if (dx > width * 0.22 || velocity > 0.45) next = Math.max(0, index - 1);
			trackSet(0, true);
			if (next !== index) onIndexChange(next);
		},
		onWheelSwipe: (direction) => onIndexChange(direction === 'left' ? Math.min(count - 1, index + 1) : Math.max(0, index - 1)),
	});
	useEffect(() => { trackSet(0, true); });
	// the height of the page shown, followed as its content changes
	useEffect(() => {
		if (!isHeightFollow) return undefined;
		const root = rootRef.current;
		const page = trackRef.current?.children[index];
		if (!root || !page) return undefined;
		const heightSet = () => { root.style.height = `${page.offsetHeight}px`; };
		heightSet();
		const observer = new ResizeObserver(heightSet);
		observer.observe(page);
		return () => observer.disconnect();
	}, [isHeightFollow, index]);
	return (
		<div ref={rootRef} className={`zene-pager${isHeightFollow ? ' is-height-follow' : ''}${className ? ` ${className}` : ''}`}>
			<div ref={trackRef} className="zene-pager-track" style={{ transform: `translateX(${-index * 100}%)` }}>
				{pageList.map((page, pageIndex) => (
					<div key={page.id} className="zene-pager-page" aria-hidden={pageIndex !== index} data-page={page.id}>
						{!isLazy || Math.abs(pageIndex - index) <= 1 ? page.render() : null}
					</div>
				))}
			</div>
		</div>
	);
}
