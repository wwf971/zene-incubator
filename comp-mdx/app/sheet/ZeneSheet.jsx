import { observer } from 'mobx-react-lite';
import { MdxRenderer } from '@wwf971/react-doc';
import { Briefcase, CalendarPlus, Check, Image, PenLine, Users } from 'lucide-react';
import { zeneActionGet } from '../../model/ZeneAction.js';
import { ZENE_ROLE_MANAGE_LIST } from '../../model/ZeneKind.js';
import { zeneAccountManageList, zeneEventManageIs, zeneGroupManageIs, zeneMembershipRoleList } from '../../model/ZeneRole.js';
import { zeneTimeFromLocalInput, zeneTimeZoneOf } from '../../model/ZeneTime.js';
import {
	ZENE_AVAILABILITY_STATE_LIST, ZENE_DAY_PART_LIST, ZENE_SEASON_LIST, ZENE_SPAN_UNIT_LIST, ZENE_WEEKDAY_LIST, zeneAvailabilityNormalize, zeneAvailabilityReport,
	zeneDayOf, zeneDayOfTime, zeneDayText, zeneDeclarationCheck, zeneDeclarationText, zeneMonthLabel, zeneSpanDayRange, zeneSpanOfDay, zeneSpanText,
} from '../../model/ZeneAvailability.js';
import { ZeneAvatar } from '../part/ZeneAvatar.jsx';
import { ZeneField, ZeneSegment, ZeneTagPicker, ZeneToggle } from '../part/ZeneForm.jsx';
import { ZeneIcon } from '../part/ZeneIcon.jsx';
import { ZeneActionButton, ZeneRow } from '../part/ZenePart.jsx';
import { roleTextOf } from '../screen/ZeneAccountView.jsx';

// The sheets of the app (doc/zene-ui.md#forms): a form slides up over the screens, as on a phone.
// A form is the input of one action of the catalog: it builds the input from its draft, the Done
// button asks the action whether it would take it (greyed with the reason), and running it is the
// only thing it does. Under the fields the form says which action it runs and what that changes.

// one form: the input it builds, the action it runs, and what follows a success
const FORM_BY_KIND = {
	register: {
		title: 'Create an account',
		actionGet: () => 'account.register',
		inputGet: (draft) => ({ name: draft.name ?? '', handle: draft.handle ?? '', area: draft.area ?? '', bio: draft.bio ?? '', skillList: draft.skillList ?? [] }),
		onDone: (app, result) => { app.store.signIn(app.world, result.personId); app.store.tabSet('me'); },
		Body: ({ app, draft, onChange }) => (
			<>
				<ZeneField label="Name" draft={draft} field="name" onChange={onChange} placeholder="Your name" />
				<ZeneField label="Handle" draft={draft} field="handle" onChange={onChange} placeholder="e.g. kei.trumpet" hint="how others find you: a-z, 0-9, . and _" />
				<ZeneField label="Where you play" draft={draft} field="area" onChange={onChange} placeholder="e.g. Shinjuku, Tokyo" />
				<ZeneField label="A line about you" draft={draft} field="bio" onChange={onChange} placeholder="optional" />
				<ZeneTagPicker world={app.world} label="What you play" draft={draft} field="skillList" onChange={onChange} kindList={['skill']} hint="the first one is your main instrument" />
			</>
		),
	},
	apply: {
		title: 'Apply',
		actionGet: (param) => ({ group: 'group.apply', event: 'event.apply', post: 'hiring.apply' }[param.kind]),
		inputGet: (draft, param) => ({ [param.kind === 'post' ? 'post' : param.kind]: param.id, message: draft.message ?? '', skillList: draft.skillList ?? [] }),
		onDone: (app) => app.store.toastShow('Application sent: it waits for a decision'),
		Body: ({ app, draft, onChange, param }) => {
			const world = app.world;
			const target = param.kind === 'post' ? world.get('post', param.id) : world.get(param.kind, param.id);
			const label = param.kind === 'post' ? `the hiring post of @${world.get('account', target?.account)?.handle ?? ''}` : target?.name;
			return (
				<>
					<p className="zene-sheet-lead">To {label}</p>
					<ZeneField label="Message" draft={draft} field="message" onChange={onChange} isMultiLine placeholder="What you play, what you played, when you are free" />
					<ZeneTagPicker world={world} label="What you would play" draft={draft} field="skillList" onChange={onChange} kindList={['skill']} />
				</>
			);
		},
	},
	postCreate: {
		title: 'New post',
		actionGet: () => 'post.create',
		inputGet: (draft, param, app) => {
			const tagList = draft.tagList ?? [];
			const icon = app.world.tag.iconOf(tagList[0] ?? '') || 'note';
			const input = {
				postKind: draft.postKind ?? param.postKind ?? 'general', text: draft.text ?? '', tagList, event: draft.event ?? '',
				media: draft.isPicture ? [{ kind: 'image', title: draft.pictureTitle || 'A picture', icon, color: app.world.tag.colorOf(tagList[0] ?? '') || '#ffd6a5' }] : [],
			};
			if (input.postKind === 'hiring') {
				const [kind, id] = String(draft.hiringTarget ?? '').split(':');
				input.hiring = { target: { kind, id }, tag: (draft.hiringTag ?? [])[0] ?? '', count: Number(draft.hiringCount) || 1, requirement: draft.hiringRequirement ?? '' };
			}
			return input;
		},
		onDone: (app) => { app.store.tabSet('home'); app.store.popToRoot(); },
		Body: observer(({ app, draft, onChange, param }) => {
			const world = app.world;
			const postKind = draft.postKind ?? param.postKind ?? 'general';
			const { personId } = app.store.actor;
			const targetList = [
				...world.list('group').filter((one) => zeneGroupManageIs(world, personId, one.id, app.time)).map((one) => ({ id: `group:${one.id}`, label: one.name, detail: 'group' })),
				...world.list('event').filter((one) => one.eventKind !== 'rehearsal' && zeneEventManageIs(world, personId, one.id, app.time)).map((one) => ({ id: `event:${one.id}`, label: one.name, detail: 'event' })),
			];
			return (
				<>
					<ZeneSegment label="Kind" draft={{ postKind }} field="postKind" onChange={onChange} optionList={[{ id: 'general', label: 'Post' }, { id: 'performance', label: 'Performance' }, { id: 'announcement', label: 'News' }, { id: 'hiring', label: 'Hiring' }]} />
					<ZeneField label="Text" draft={draft} field="text" onChange={onChange} isMultiLine placeholder="What is happening" />
					<ZeneToggle label="A picture" draft={draft} field="isPicture" onChange={onChange} hint="drawn from the first tag: the demonstration keeps no files" />
					{draft.isPicture ? <ZeneField label="Caption of the picture" draft={draft} field="pictureTitle" onChange={onChange} /> : null}
					<ZeneTagPicker world={world} label="Tags" draft={draft} field="tagList" onChange={onChange} />
					{postKind === 'hiring' ? (
						<>
							<ZeneChoiceList label="Hiring for" draft={draft} field="hiringTarget" onChange={onChange} optionList={targetList} emptyText="You manage no group or event to hire for." />
							<ZeneTagPicker world={world} label="Looking for" draft={draft} field="hiringTag" onChange={onChange} kindList={['skill']} isSingle />
							<ZeneField label="How many" draft={draft} field="hiringCount" onChange={onChange} type="number" placeholder="1" />
							<ZeneField label="What is required" draft={draft} field="hiringRequirement" onChange={onChange} placeholder="rehearsals, level, repertoire" />
						</>
					) : null}
				</>
			);
		}),
	},
	eventCreate: {
		title: 'New event',
		actionGet: () => 'event.create',
		inputGet: (draft) => {
			const zone = zeneTimeZoneOf('');
			return {
				name: draft.name ?? '', eventKind: draft.eventKind ?? 'concert', isCommercial: draft.isCommercial === true,
				timeStart: zeneTimeFromLocalInput(draft.timeStart, zone), timeEnd: zeneTimeFromLocalInput(draft.timeEnd, zone),
				venue: { name: draft.venueName ?? '', area: draft.venueArea ?? '' }, description: draft.description ?? '',
				programList: (draft.programList ?? []).map((tag) => ({ tag })), openList: (draft.openList ?? []).map((tag) => ({ tag, count: 1 })),
				ticket: draft.isCommercial ? { price: Number(draft.ticketPrice) || 0, currency: 'JPY' } : {}, handle: draft.handle ?? '',
			};
		},
		onDone: (app, result) => { app.store.popToRoot(); app.eventOpen(result.eventId); app.store.toastShow('A draft: publish it when it is ready'); },
		Body: ({ app, draft, onChange }) => (
			<>
				<p className="zene-sheet-lead">Organized by {app.world.get('account', app.store.actor.accountId)?.name}</p>
				<ZeneField label="Name" draft={draft} field="name" onChange={onChange} placeholder="e.g. Spring Concert" />
				<ZeneSegment label="Kind" draft={draft} field="eventKind" onChange={onChange} optionList={['concert', 'session', 'workshop', 'audition', 'meetup'].map((id) => ({ id, label: id }))} />
				<ZeneToggle label="Commercial" draft={draft} field="isCommercial" onChange={onChange} hint="tickets are sold, players may be paid" />
				{draft.isCommercial ? <ZeneField label="Ticket" draft={draft} field="ticketPrice" onChange={onChange} type="number" suffix="JPY" /> : null}
				<ZeneField label="Starts" draft={draft} field="timeStart" onChange={onChange} type="datetime-local" suffix={zoneText()} />
				<ZeneField label="Ends" draft={draft} field="timeEnd" onChange={onChange} type="datetime-local" suffix={zoneText()} />
				<ZeneField label="Venue" draft={draft} field="venueName" onChange={onChange} placeholder="a hall, a café, a studio" />
				<ZeneField label="Area" draft={draft} field="venueArea" onChange={onChange} placeholder="e.g. Shibuya, Tokyo" />
				<ZeneField label="About it" draft={draft} field="description" onChange={onChange} isMultiLine rowCount={3} />
				<ZeneTagPicker world={app.world} label="Program" draft={draft} field="programList" onChange={onChange} kindList={['work']} />
				<ZeneTagPicker world={app.world} label="Open positions" draft={draft} field="openList" onChange={onChange} kindList={['skill']} hint="who may apply to take part" />
				<ZeneField label="Handle of its account" draft={draft} field="handle" onChange={onChange} placeholder="optional, e.g. spring.concert" hint="an event account is temporary: it stops 30 days after the event" />
			</>
		),
	},
	groupCreate: {
		title: 'New group',
		actionGet: () => 'group.create',
		inputGet: (draft) => ({ name: draft.name ?? '', handle: draft.handle ?? '', area: draft.area ?? '', description: draft.description ?? '', tagList: draft.tagList ?? [], joinPolicy: draft.joinPolicy ?? 'apply' }),
		onDone: (app, result) => { app.store.popToRoot(); app.accountOpen(result.accountId); },
		Body: ({ app, draft, onChange }) => (
			<>
				<ZeneField label="Name" draft={draft} field="name" onChange={onChange} placeholder="e.g. Kichijoji Wind Ensemble" />
				<ZeneField label="Handle" draft={draft} field="handle" onChange={onChange} placeholder="e.g. kichijoji.winds" />
				<ZeneField label="Area" draft={draft} field="area" onChange={onChange} />
				<ZeneField label="About the group" draft={draft} field="description" onChange={onChange} isMultiLine rowCount={3} />
				<ZeneSegment label="Joining" draft={draft} field="joinPolicy" onChange={onChange} optionList={[{ id: 'apply', label: 'by application' }, { id: 'open', label: 'open' }, { id: 'invite', label: 'by invitation' }]} />
				<ZeneTagPicker world={app.world} label="What it plays" draft={draft} field="tagList" onChange={onChange} kindList={['genre', 'work', 'skill']} />
			</>
		),
	},
	subgroupCreate: {
		title: 'New subgroup',
		actionGet: () => 'subgroup.create',
		inputGet: (draft, param) => ({ group: param.group, name: draft.name ?? '', description: draft.description ?? '', joinPolicy: draft.joinPolicy ?? 'open', tagList: draft.tagList ?? [] }),
		onDone: (app, result) => app.push('subgroup', { id: result.subgroupId }),
		Body: ({ app, draft, onChange }) => (
			<>
				<ZeneField label="Name" draft={draft} field="name" onChange={onChange} placeholder="e.g. Brass quintet" />
				<ZeneField label="What it is for" draft={draft} field="description" onChange={onChange} isMultiLine rowCount={3} />
				<ZeneSegment label="Joining" draft={draft} field="joinPolicy" onChange={onChange} optionList={[{ id: 'open', label: 'members join it' }, { id: 'lead', label: 'its leads add them' }]} />
				<ZeneTagPicker world={app.world} label="Tags" draft={draft} field="tagList" onChange={onChange} />
			</>
		),
	},
	// tags added to a list of a homepage, from its edit mode: what a person plays, the works they
	// love; what a group looks for, what it plays
	tagAdd: {
		title: (param) => ({ skill: 'What you play', work: 'Works you love', recruit: 'Who the group looks for', groupTag: 'What the group plays' }[param.purpose] ?? 'Add'),
		actionGet: (param) => (param.individual ? 'individual.update' : 'group.update'),
		inputGet: (draft, param, app) => {
			const chosenList = draft.tagList ?? [];
			if (param.individual) {
				const person = app.world.get('individual', param.individual);
				if (param.purpose === 'skill') {
					const known = new Set((person?.skillList ?? []).map((one) => one.tag));
					return { individual: param.individual, skillList: [...(person?.skillList ?? []), ...chosenList.filter((tag) => !known.has(tag)).map((tag) => ({ tag, level: 3, isPrimary: (person?.skillList ?? []).length === 0 }))] };
				}
				return { individual: param.individual, workTagList: [...new Set([...(person?.workTagList ?? []), ...chosenList])] };
			}
			const group = app.world.get('group', param.group);
			if (param.purpose === 'recruit') {
				const known = new Set((group?.recruitList ?? []).map((one) => one.tag));
				return { group: param.group, recruitList: [...(group?.recruitList ?? []), ...chosenList.filter((tag) => !known.has(tag)).map((tag) => ({ tag, count: 1 }))] };
			}
			return { group: param.group, tagList: [...new Set([...(group?.tagList ?? []), ...chosenList])] };
		},
		Body: ({ app, draft, onChange, param }) => {
			const kindList = { skill: ['skill'], work: ['work', 'composer'], recruit: ['skill'], groupTag: ['genre', 'work', 'skill'] }[param.purpose];
			const label = { skill: 'What you play', work: 'Works and composers you love', recruit: 'Who the group looks for', groupTag: 'What the group plays' }[param.purpose];
			return <ZeneTagPicker world={app.world} label={label} draft={draft} field="tagList" onChange={onChange} kindList={kindList} hint="a tag missing? the + tab adds one" />;
		},
	},
	// a declaration of when one can play (doc/zene-availability.md), new or changed
	availabilityDeclare: {
		title: 'When you can play',
		actionGet: () => 'availability.declare',
		draftInitial: (app, param) => {
			const declaration = param.declarationId ? app.world.availabilityOfSubject(param.subject.kind, param.subject.id)?.declarationList.find((one) => one.id === param.declarationId) : undefined;
			const thisYear = String(app.time).slice(0, 4);
			// a new declaration starts at now: this month, this season
			const seasonNow = zeneSpanOfDay('season', zeneDayOfTime(app.time)).value;
			if (!declaration) return { state: 'available', unit: 'always', year: thisYear, season: seasonNow.slice(5), month: String(app.time).slice(4, 6), weekdayList: [], timeMode: 'all', dayPartList: [], hourFrom: '19:00', hourTo: '22:00' };
			const { span } = declaration;
			return {
				state: declaration.state, unit: span.unit, note: declaration.note, weekdayList: declaration.weekdayList, dayPartList: declaration.dayPartList,
				timeMode: declaration.hourFrom ? 'hour' : declaration.dayPartList.length ? 'part' : 'all', hourFrom: declaration.hourFrom || '19:00', hourTo: declaration.hourTo || '22:00',
				year: span.value.slice(0, 4) || thisYear, season: span.unit === 'season' ? span.value.slice(5) : 'spring', month: span.unit === 'month' ? span.value.slice(5, 7) : '01',
				day: span.unit === 'day' ? span.value : '', dayFrom: span.from, dayTo: span.to, weekOf: span.unit === 'week' ? zeneDayText(zeneSpanDayRange(span)?.dayFrom ?? 0) : '',
			};
		},
		inputGet: (draft, param) => {
			const unit = draft.unit ?? 'always';
			const span = unit === 'year' ? { unit, value: draft.year }
				: unit === 'season' ? { unit, value: `${draft.year}-${draft.season}` }
					: unit === 'month' ? { unit, value: `${draft.year}-${draft.month}` }
						: unit === 'week' ? (draft.weekOf ? zeneSpanOfDay('week', zeneDayOf(draft.weekOf)) : { unit, value: '' })
							: unit === 'day' ? { unit, value: draft.day ?? '' }
								: unit === 'range' ? { unit, from: draft.dayFrom ?? '', to: draft.dayTo ?? '' } : { unit: 'always' };
			return {
				subject: param.subject,
				declaration: {
					...(param.declarationId ? { id: param.declarationId } : {}),
					state: draft.state ?? 'available', span, weekdayList: draft.weekdayList ?? [], note: draft.note ?? '',
					dayPartList: draft.timeMode === 'part' ? draft.dayPartList ?? [] : [],
					...(draft.timeMode === 'hour' ? { hourFrom: draft.hourFrom ?? '', hourTo: draft.hourTo ?? '' } : {}),
				},
			};
		},
		Body: observer(({ app, draft, onChange, param }) => {
			const unit = draft.unit ?? 'always';
			const yearNow = Number(String(app.time).slice(0, 4));
			const yearList = [yearNow, yearNow + 1, yearNow + 2].map((one) => ({ id: String(one), label: String(one) }));
			const weekdaySet = new Set(draft.weekdayList ?? []);
			const weekdayToggle = (id) => onChange({ weekdayList: ZENE_WEEKDAY_LIST.map((one) => one.id).filter((one) => (one === id ? !weekdaySet.has(one) : weekdaySet.has(one))) });
			const partSet = new Set(draft.dayPartList ?? []);
			const partToggle = (id) => onChange({ dayPartList: ZENE_DAY_PART_LIST.map((one) => one.id).filter((one) => (one === id ? !partSet.has(one) : partSet.has(one))) });
			// what it would decide: the next eight weeks, with it declared
			const input = FORM_BY_KIND.availabilityDeclare.inputGet(draft, param);
			const held = app.world.availabilityOfSubject(param.subject.kind, param.subject.id);
			const availability = zeneAvailabilityNormalize({ ...(held ?? { subject: param.subject }), declarationList: [...(held?.declarationList ?? []).filter((one) => one.id !== param.declarationId), { ...input.declaration, id: 'preview', timeDeclared: app.time }] });
			const preview = zeneDeclarationCheck(availability.declarationList.at(-1)) ? null : zeneAvailabilityReport(availability, { time: app.time, weekCount: 8 }).declarationList.find((one) => one.declaration.id === 'preview');
			return (
				<>
					<ZeneSegment label="State" draft={draft} field="state" onChange={onChange} optionList={ZENE_AVAILABILITY_STATE_LIST.map((one) => ({ id: one.id, label: one.label }))} />
					<div className="zene-field">
						<span className="zene-field-label">When</span>
						<div className="zene-chip-choice-row">
							{ZENE_SPAN_UNIT_LIST.map((one) => <button key={one.id} type="button" className={`zene-chip-choice${unit === one.id ? ' is-on' : ''}`} aria-pressed={unit === one.id} title={one.description} onClick={() => onChange({ unit: one.id })}>{one.label}</button>)}
						</div>
						{['year', 'season', 'month'].includes(unit) ? <div className="zene-chip-choice-row">{yearList.map((one) => <button key={one.id} type="button" className={`zene-chip-choice${draft.year === one.id ? ' is-on' : ''}`} onClick={() => onChange({ year: one.id })}>{one.label}</button>)}</div> : null}
						{unit === 'season' ? <div className="zene-chip-choice-row">{ZENE_SEASON_LIST.map((one) => <button key={one.id} type="button" className={`zene-chip-choice${draft.season === one.id ? ' is-on' : ''}`} onClick={() => onChange({ season: one.id })}>{one.label}</button>)}</div> : null}
						{unit === 'month' ? (
							<div className="zene-month-grid">
								{['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((month) => <button key={month} type="button" className={`zene-chip-choice${draft.month === month ? ' is-on' : ''}`} onClick={() => onChange({ month })}>{zeneMonthLabel(zeneDayOf(`2027-${month}-01`))}</button>)}
							</div>
						) : null}
						{unit === 'week' ? <ZeneField label="A day of the week" draft={draft} field="weekOf" onChange={onChange} type="date" /> : null}
						{unit === 'day' ? <ZeneField label="The day" draft={draft} field="day" onChange={onChange} type="date" /> : null}
						{unit === 'range' ? <><ZeneField label="From" draft={draft} field="dayFrom" onChange={onChange} type="date" /><ZeneField label="To" draft={draft} field="dayTo" onChange={onChange} type="date" /></> : null}
						<span className="zene-field-hint">{zeneSpanText(input.declaration.span, held?.zone ?? '+09')}</span>
					</div>
					<div className="zene-field">
						<span className="zene-field-label">Days of the week</span>
						<div className="zene-chip-choice-row">
							{ZENE_WEEKDAY_LIST.map((one) => <button key={one.id} type="button" className={`zene-chip-choice is-day${weekdaySet.has(one.id) ? ' is-on' : ''}`} aria-pressed={weekdaySet.has(one.id)} onClick={() => weekdayToggle(one.id)}>{one.label}</button>)}
						</div>
						<div className="zene-chip-choice-row">
							<button type="button" className="zene-link is-small" onClick={() => onChange({ weekdayList: ['mon', 'tue', 'wed', 'thu', 'fri'] })}>weekdays</button>
							<button type="button" className="zene-link is-small" onClick={() => onChange({ weekdayList: ['sat', 'sun'] })}>weekends</button>
							<button type="button" className="zene-link is-small" onClick={() => onChange({ weekdayList: [] })}>every day</button>
						</div>
					</div>
					<ZeneSegment label="Time of the day" draft={{ timeMode: draft.timeMode ?? 'all' }} field="timeMode" onChange={onChange} optionList={[{ id: 'all', label: 'Whole day' }, { id: 'part', label: 'Parts' }, { id: 'hour', label: 'Hours' }]} />
					{draft.timeMode === 'part' ? (
						<div className="zene-chip-choice-row is-field">
							{ZENE_DAY_PART_LIST.map((one) => <button key={one.id} type="button" className={`zene-chip-choice${partSet.has(one.id) ? ' is-on' : ''}`} aria-pressed={partSet.has(one.id)} title={`${String(one.hourFrom).padStart(2, '0')}:00–${String(one.hourTo).padStart(2, '0')}:00`} onClick={() => partToggle(one.id)}>{one.label}</button>)}
						</div>
					) : null}
					{draft.timeMode === 'hour' ? (
						<div className="zene-field-pair">
							<ZeneField label="From" draft={draft} field="hourFrom" onChange={onChange} type="time" suffix={held?.zone ?? '+09'} />
							<ZeneField label="To" draft={draft} field="hourTo" onChange={onChange} type="time" suffix={held?.zone ?? '+09'} />
						</div>
					) : null}
					<ZeneField label="Note" draft={draft} field="note" onChange={onChange} placeholder="why, or what for (optional)" />
					<p className="zene-sheet-lead is-preview">
						{zeneDeclarationText(zeneAvailabilityNormalize({ declarationList: [input.declaration] }).declarationList[0], held?.zone ?? '+09')}
						{preview ? <em>{preview.coverCount === 0 ? ' · covers nothing in the next eight weeks' : ` · decides ${preview.winCount} of the ${preview.coverCount} parts of days it covers in the next eight weeks`}</em> : null}
					</p>
				</>
			);
		}),
	},
	homepageEdit: {
		title: 'Homepage',
		actionGet: () => 'homepage.write',
		draftInitial: (app, param) => {
			const account = app.world.get('account', param.account);
			return { text: (account?.homepage && app.world.get('page', account.homepage)?.text) || '## About me\n\n' };
		},
		inputGet: (draft, param) => ({ account: param.account, text: draft.text ?? '' }),
		Body: ({ app, draft, onChange }) => (
			<>
				<ZeneField label="Markdown" draft={draft} field="text" onChange={onChange} isMultiLine rowCount={10} hint="headings, lists, tables, links: the homepage is a document of the page" />
				<div className="zene-field">
					<span className="zene-field-label">Preview</span>
					<div className="zene-preview"><MdxRenderer data={{ source: draft.text ?? '' }} config={{ className: 'zene-homepage prose' }} /></div>
				</div>
			</>
		),
	},
	rehearsalCreate: {
		title: 'Add a rehearsal',
		actionGet: () => 'rehearsal.create',
		inputGet: (draft, param) => ({ event: param.event, name: draft.name ?? '', timeStart: zeneTimeFromLocalInput(draft.timeStart), timeEnd: zeneTimeFromLocalInput(draft.timeEnd), ...(draft.venueName ? { venue: { name: draft.venueName, area: draft.venueArea ?? '' } } : {}) }),
		Body: ({ app, draft, onChange, param }) => (
			<>
				<p className="zene-sheet-lead">For {app.world.get('event', param.event)?.name}: seen by those taking part</p>
				<ZeneField label="Name" draft={draft} field="name" onChange={onChange} placeholder="optional: Rehearsal 4" />
				<ZeneField label="Starts" draft={draft} field="timeStart" onChange={onChange} type="datetime-local" suffix={zoneText()} />
				<ZeneField label="Ends" draft={draft} field="timeEnd" onChange={onChange} type="datetime-local" suffix={zoneText()} />
				<ZeneField label="Venue" draft={draft} field="venueName" onChange={onChange} placeholder="the venue of the event when empty" />
			</>
		),
	},
	invite: {
		title: 'Invite',
		actionGet: () => 'event.invite',
		inputGet: (draft, param) => {
			const [kind, id] = String(draft.principal ?? '').split(':');
			return { event: param.event, principal: { kind, id }, role: draft.role ?? 'performer' };
		},
		Body: observer(({ app, draft, onChange, param }) => {
			const world = app.world;
			const event = world.get('event', param.event);
			const word = String(draft.text ?? '').toLowerCase();
			const optionList = [
				...world.list('group').map((one) => ({ id: `group:${one.id}`, label: one.name, detail: 'group', kind: 'group', entityId: one.id })),
				...world.list('individual').map((one) => ({ id: `individual:${one.id}`, label: one.name, detail: 'person', kind: 'individual', entityId: one.id })),
			].filter((one) => !event?.principalList.some((principal) => principal.kind === one.kind && principal.id === one.entityId && principal.status !== 'declined'))
				.filter((one) => !word || one.label.toLowerCase().includes(word)).slice(0, 12);
			return (
				<>
					<p className="zene-sheet-lead">To {event?.name}</p>
					<ZeneSegment label="As" draft={draft} field="role" onChange={onChange} optionList={['performer', 'guest', 'host'].map((id) => ({ id, label: id }))} />
					<ZeneField label="Find" draft={draft} field="text" onChange={onChange} placeholder="a group or a person" />
					<ZeneChoiceList label="Who" draft={draft} field="principal" onChange={onChange} optionList={optionList} emptyText="Nobody found." />
				</>
			);
		}),
	},
};

function zoneText() {
	const zone = zeneTimeZoneOf('');
	return `${zone < 0 ? '-' : '+'}${String(Math.abs(zone)).padStart(2, '0')}`;
}

// one of a list, chosen by a tap
const ZeneChoiceList = observer(function ZeneChoiceList({ label, draft, field, onChange, optionList, emptyText }) {
	return (
		<div className="zene-field">
			<span className="zene-field-label">{label}</span>
			<div className="zene-choice-list">
				{optionList.length === 0 ? <span className="zene-field-hint">{emptyText}</span> : null}
				{optionList.map((option) => (
					<button key={option.id} type="button" className={`zene-choice${draft[field] === option.id ? ' is-on' : ''}`} aria-pressed={draft[field] === option.id} onClick={() => onChange({ [field]: option.id })}>
						<span>{option.label}</span><em>{option.detail}</em>{draft[field] === option.id ? <Check size={14} /> : null}
					</button>
				))}
			</div>
		</div>
	);
});

// the sheet open, if any: a form, the menu of what can be created, the roles of a member
export const ZeneSheetHost = observer(function ZeneSheetHost({ app }) {
	const sheet = app.store.sheet;
	if (!sheet) return null;
	if (sheet.kind === 'member') return <ZeneSheetFrame app={app} title="Member"><ZeneMemberSheet app={app} param={sheet.param} /></ZeneSheetFrame>;
	const form = FORM_BY_KIND[sheet.kind];
	if (!form) return null;
	return <ZeneFormSheet key={sheet.seq} app={app} kind={sheet.kind} form={form} param={sheet.param} />;
});

function ZeneSheetFrame({ app, title, right = null, children }) {
	return (
		<div className="zene-sheet-layer" onClick={(event) => { if (event.target === event.currentTarget) app.store.sheetClose(); }}>
			<div className="zene-sheet" role="dialog" aria-label={title}>
				<div className="zene-sheet-grip" />
				<header className="zene-sheet-head">
					<button type="button" className="zene-sheet-cancel" onClick={() => app.store.sheetClose()}>Cancel</button>
					<strong>{title}</strong>
					<span className="zene-sheet-right">{right}</span>
				</header>
				<div className="zene-sheet-body" data-zene-scroll="" data-zene-noswipe="">{children}</div>
			</div>
		</div>
	);
}

const ZeneFormSheet = observer(function ZeneFormSheet({ app, kind, form, param }) {
	const draftKey = `${kind}:${JSON.stringify(param)}`;
	const draft = app.store.draftGet(draftKey, form.draftInitial ? form.draftInitial(app, param) : {});
	const onChange = (change) => app.store.draftSet(draftKey, change);
	const actionId = form.actionGet(param);
	const action = zeneActionGet(actionId);
	const input = form.inputGet(draft, param, app);
	const reason = app.backend.actionReasonGet(actionId, app.store.actor, input, { isInputChecked: true });
	const submit = () => {
		const answer = app.actionRun(actionId, input);
		if (answer.code !== 0) return;
		app.store.draftClear(draftKey);
		app.store.sheetClose();
		form.onDone?.(app, answer.data.result);
	};
	const { Body } = form;
	return (
		<ZeneSheetFrame app={app} title={typeof form.title === 'function' ? form.title(param) : form.title} right={<button type="button" className="zene-sheet-done" disabled={Boolean(reason)} title={reason || undefined} onClick={submit}>Done</button>}>
			<Body app={app} draft={draft} onChange={onChange} param={param} />
			{reason ? <p className="zene-sheet-reason">{reason}</p> : null}
			<p className="zene-sheet-semantic">
				Runs <code>{actionId}</code>: {action?.effectText.join('; ')}. Allowed for {action?.whoText}.
			</p>
		</ZeneSheetFrame>
	);
});

// the roles of a member, given and ended by the managers of the group (membership.roleSet)
const ZeneMemberSheet = observer(function ZeneMemberSheet({ app, param }) {
	const world = app.world;
	const membership = world.get('membership', param.membership);
	if (!membership) return <p className="zene-note">This membership is gone.</p>;
	const individual = world.get('individual', membership.individual);
	const roleNow = zeneMembershipRoleList(membership, app.time);
	const roleList = [...ZENE_ROLE_MANAGE_LIST, ...world.list('tag').filter((tag) => tag.kindList.includes('role')).map((tag) => tag.id)];
	return (
		<>
			<ZeneRow picture={<ZeneAvatar account={world.accountOfSubject('individual', membership.individual)} size={38} />} title={individual?.name} detail={roleTextOf(world, roleNow) || 'member'} />
			<p className="zene-field-label">Roles now</p>
			<div className="zene-role-grid">
				{roleList.map((role) => {
					const isOn = roleNow.includes(role);
					return <ZeneActionButton key={role} app={app} actionId="membership.roleSet" input={{ membership: membership.id, role, isOn: !isOn }} label={roleTextOf(world, [role])} tone={isOn ? 'primary' : ''} Icon={isOn ? Check : undefined} isCompact />;
				})}
			</div>
			<p className="zene-field-hint">A role is held for a period: giving it starts one, ending it closes it. Owner and admin are given by an owner.</p>
			<div className="zene-button-row">
				<ZeneActionButton app={app} actionId="membership.remove" input={{ membership: membership.id }} label="Remove from the group" tone="danger" onDone={() => app.store.sheetClose()} />
			</div>
		</>
	);
});

// the menu of the Create tab: what the account acted as can make
export const ZeneCreateMenu = observer(function ZeneCreateMenu({ app }) {
	if (app.store.menu !== 'create') return null;
	const actor = app.store.actor;
	const itemList = [
		{ id: 'post', label: 'Post', detail: 'news, a picture, a performance', Icon: Image, actionId: 'post.create', open: () => app.store.sheetOpen('postCreate', { postKind: 'general' }) },
		{ id: 'hiring', label: 'Hiring post', detail: 'look for players for a group or an event', Icon: Briefcase, actionId: 'post.create', open: () => app.store.sheetOpen('postCreate', { postKind: 'hiring' }) },
		{ id: 'event', label: 'Event', detail: 'a concert, a session, a workshop', Icon: CalendarPlus, actionId: 'event.create', open: () => app.store.sheetOpen('eventCreate') },
		{ id: 'group', label: 'Group', detail: 'an orchestra, a band, a choir', Icon: Users, actionId: 'group.create', open: () => app.store.sheetOpen('groupCreate') },
		{ id: 'tag', label: 'Tag', detail: 'an instrument, a work, a composer missing', Icon: PenLine, actionId: 'tag.create', open: () => app.store.sheetOpen('tagCreate') },
	];
	return (
		<div className="zene-sheet-layer is-menu" onClick={(event) => { if (event.target === event.currentTarget) app.store.menuSet(''); }}>
			<div className="zene-sheet is-menu" role="menu" aria-label="Create">
				<div className="zene-sheet-grip" />
				<p className="zene-menu-title">Create as {app.world.get('account', actor.accountId)?.name ?? 'a visitor'}</p>
				{itemList.map((item) => {
					const reason = app.backend.actionReasonGet(item.actionId, actor, {});
					return (
						<button key={item.id} type="button" role="menuitem" className="zene-menu-item" disabled={Boolean(reason)} title={reason || undefined} onClick={item.open}>
							<span className="zene-menu-icon"><item.Icon size={18} /></span>
							<span className="zene-menu-text"><strong>{item.label}</strong><em>{reason || item.detail}</em></span>
						</button>
					);
				})}
			</div>
		</div>
	);
});

// the menu of the Me tab: the accounts the person may act as
export const ZeneAccountMenu = observer(function ZeneAccountMenu({ app }) {
	if (app.store.menu !== 'account') return null;
	const world = app.world;
	const list = zeneAccountManageList(world, app.store.actor.personId, app.time);
	return (
		<div className="zene-sheet-layer is-menu" onClick={(event) => { if (event.target === event.currentTarget) app.store.menuSet(''); }}>
			<div className="zene-sheet is-menu" role="menu" aria-label="Act as">
				<div className="zene-sheet-grip" />
				<p className="zene-menu-title">Act as</p>
				{list.map((account) => (
					<button key={account.id} type="button" role="menuitemradio" aria-checked={account.id === app.store.actor.accountId} className="zene-menu-item" onClick={() => app.store.actAs(account.id)}>
						<ZeneAvatar account={account} size={34} />
						<span className="zene-menu-text"><strong>{account.name}</strong><em>@{account.handle} · {account.subject.kind === 'individual' ? 'you' : account.subject.kind}</em></span>
						{account.id === app.store.actor.accountId ? <Check size={16} /> : null}
					</button>
				))}
				<p className="zene-field-hint is-menu">A group's account is yours while you are an owner or admin; an event's while you organize it.</p>
			</div>
		</div>
	);
});

// a tag added by anyone signed in
FORM_BY_KIND.tagCreate = {
	title: 'New tag',
	actionGet: () => 'tag.create',
	inputGet: (draft) => ({ label: draft.label ?? '', kindList: [draft.kind ?? 'skill'], parentList: draft.parentList ?? [], composerList: draft.composerList ?? [], originList: draft.originList ?? [] }),
	Body: ({ app, draft, onChange }) => (
		<>
			<ZeneField label="Label" draft={draft} field="label" onChange={onChange} placeholder="e.g. Euphonium" />
			<ZeneSegment label="Kind" draft={draft} field="kind" onChange={onChange} optionList={['skill', 'work', 'composer', 'genre', 'role'].map((id) => ({ id, label: id }))} />
			<ZeneTagPicker world={app.world} label="Below" draft={draft} field="parentList" onChange={onChange} hint="a tag may lie below several: the tags form a DAG" />
			{draft.kind === 'work' ? <ZeneTagPicker world={app.world} label="Composers" draft={draft} field="composerList" onChange={onChange} kindList={['composer']} /> : null}
			{draft.kind === 'work' ? <ZeneTagPicker world={app.world} label="Comes from" draft={draft} field="originList" onChange={onChange} kindList={['work']} hint="the game, the film, the larger work" /> : null}
			<div className="zene-tag-preview"><ZeneIcon name={app.world.tag.iconOf((draft.parentList ?? [])[0] ?? '') || 'note'} color={app.world.tag.colorOf((draft.parentList ?? [])[0] ?? '')} size={40} isSticker /><span>drawn with the icon of the tag above it</span></div>
		</>
	),
};
