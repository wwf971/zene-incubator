import { observer } from 'mobx-react-lite';
import { zeneLaneLayout, zenePeriodText } from '../../model/ZeneTimeline.js';
import { zeneTimeMs } from '../../model/ZeneTime.js';

// Periods on a timeline (doc/zene-timeline.md#on-a-timeline): a row per group (or per person), its
// memberships as thick bars and the periods of its roles as thin ones below, each in a lane of its
// own where two may overlap, so overlapping periods (two roles at once, one role held twice at
// once) are always all seen. An end known only to its month or year is drawn as a fade over that
// month or year: the bar does not pretend to know the day. An open end runs to now.
//
//   rowList   [{ id, label, onOpen?, barList: [{ id, period, label, tone: member | role | manage | life }] }]
//   chartKey  the key of the chart's state in the app store (the bar selected)

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const TONE_COLOR = { member: '#8ecae6', role: '#ffd166', manage: '#f4a261', life: '#cdb4db' };

export const ZeneTimelineChart = observer(function ZeneTimelineChart({ app, rowList, chartKey, emptyText = 'Nothing on the timeline.' }) {
	const now = zeneTimeMs(app.time);
	const ui = app.store.uiGet(chartKey, { barId: '' });
	const layoutList = rowList.map((row) => {
		// memberships first, their roles in the lanes below
		const main = zeneLaneLayout(row.barList.filter((bar) => bar.tone === 'member' || bar.tone === 'life'), now);
		const role = zeneLaneLayout(row.barList.filter((bar) => bar.tone !== 'member' && bar.tone !== 'life'), now);
		return { row, barList: [...main.barList, ...role.barList.map((bar) => ({ ...bar, lane: bar.lane + main.laneCount }))], laneCount: main.laneCount + role.laneCount };
	});
	const spanList = layoutList.flatMap((one) => one.barList.map((bar) => bar.span)).filter(Boolean);
	if (spanList.length === 0) return <p className="zene-note zene-timeline-empty">{emptyText}</p>;
	const startYear = new Date(Math.min(...spanList.map((span) => (Number.isFinite(span.msMayFrom) ? span.msMayFrom : now)))).getUTCFullYear();
	const msFrom = Date.UTC(startYear, 0, 1);
	const msTo = Math.max(now, ...spanList.map((span) => span.msMayTo)) + 0.35 * YEAR_MS;
	const x = (ms) => Math.max(0, Math.min(100, ((Math.max(ms, msFrom) - msFrom) / (msTo - msFrom)) * 100));
	const yearCount = new Date(msTo).getUTCFullYear() - startYear + 1;
	const yearStep = yearCount > 24 ? 5 : yearCount > 12 ? 2 : 1;
	const yearList = Array.from({ length: yearCount }, (_, index) => startYear + index).filter((year) => (year - startYear) % yearStep === 0 && Date.UTC(year, 0, 1) < msTo);
	const selected = layoutList.flatMap((one) => one.barList.map((bar) => ({ bar, row: one.row }))).find((one) => one.bar.id === ui.barId);
	return (
		<div className="zene-timeline" data-zene-noswipe="">
			<div className="zene-timeline-axis">
				{yearList.map((year) => <span key={year} className="zene-timeline-year" style={{ left: `${x(Date.UTC(year, 0, 1))}%` }}>{year}</span>)}
			</div>
			<div className="zene-timeline-body">
				{yearList.map((year) => <span key={year} className="zene-timeline-grid" style={{ left: `${x(Date.UTC(year, 0, 1))}%` }} />)}
				<span className="zene-timeline-now" style={{ left: `${x(now)}%` }}><em>now</em></span>
				{layoutList.map(({ row, barList, laneCount }) => (
					<div key={row.id} className="zene-timeline-row">
						<button type="button" className="zene-timeline-label" disabled={!row.onOpen} onClick={row.onOpen}>{row.label}</button>
						<div className="zene-timeline-track" style={{ height: `${laneCount * 15}px` }}>
							{barList.map((bar) => {
								const { span } = bar;
								const left = x(span.msMayFrom);
								const width = Math.max(1.2, x(span.msMayTo) - left);
								const total = Math.max(1, span.msMayTo - (Number.isFinite(span.msMayFrom) ? span.msMayFrom : msFrom));
								const fadeFrom = Number.isFinite(span.msMayFrom) ? ((span.msSureFrom - span.msMayFrom) / total) * 100 : 0;
								const fadeTo = ((span.msMayTo - span.msSureTo) / total) * 100;
								const color = TONE_COLOR[bar.tone] ?? TONE_COLOR.role;
								return (
									<button
										key={bar.id}
										type="button"
										className={`zene-timeline-bar is-${bar.tone}${span.isOpen ? ' is-open' : ''}${bar.id === ui.barId ? ' is-selected' : ''}`}
										style={{
											left: `${left}%`, width: `${width}%`, top: `${bar.lane * 15}px`,
											background: `linear-gradient(90deg, color-mix(in srgb, ${color} 25%, transparent) 0%, ${color} ${Math.min(50, fadeFrom)}%, ${color} ${100 - Math.min(50, fadeTo)}%, color-mix(in srgb, ${color} 25%, transparent) 100%)`,
										}}
										title={`${bar.label}: ${zenePeriodText(bar.period)}`}
										onClick={() => app.store.uiSet(chartKey, { barId: bar.id === ui.barId ? '' : bar.id })}
									>
										<span>{bar.label}</span>
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>
			<p className="zene-timeline-detail">
				{selected
					? <><strong>{selected.bar.label}</strong> · {zenePeriodText(selected.bar.period)}{selected.bar.endReason ? ` (${selected.bar.endReason})` : ''} · {selected.row.label}</>
					: <span className="zene-timeline-hint">Tap a bar. A faded end is known to its month or year only.</span>}
			</p>
		</div>
	);
});
