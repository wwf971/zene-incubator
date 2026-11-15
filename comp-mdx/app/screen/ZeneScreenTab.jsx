import { observer } from 'mobx-react-lite';
import { ChevronDown, LogOut, Search, UserPlus, X } from 'lucide-react';
import { ZENE_SEARCH_KIND_LIST, zeneEventSplit, zeneFeed, zeneInbox, zeneSearch, zeneTagUseCount } from '../../model/ZeneQuery.js';
import { zeneAccountManageList, zeneEventParticipantIs } from '../../model/ZeneRole.js';
import { ZeneAvatar } from '../part/ZeneAvatar.jsx';
import { ZeneIcon } from '../part/ZeneIcon.jsx';
import { ZeneActionButton, ZeneEmpty, ZeneEventRow, ZeneHeader, ZeneRow, ZeneSection, ZeneSubjectRow, ZeneTagChip, ZeneTime } from '../part/ZenePart.jsx';
import { ZenePostCard } from '../part/ZenePostCard.jsx';
import { ZeneAccountView } from './ZeneAccountView.jsx';

// The four screens at the root of the tabs (doc/zene-ui.md#screens): Home, Discover, Activity, Me.

// --- Home: the feed -----------------------------------------------------------------------------

export const ZeneScreenHome = observer(function ZeneScreenHome({ app }) {
	const world = app.world;
	const { personId, accountId } = app.store.actor;
	const feed = zeneFeed(world, { personId, accountId, time: app.time });
	// what comes up for the person: the events they take part in, soonest first
	const comingList = personId ? zeneEventSplit(world, world.list('event').filter((one) => zeneEventParticipantIs(world, personId, one, app.time) && app.isEventVisible(one)), app.time).comingList.slice(0, 8) : [];
	return (
		<div className="zene-screen">
			<ZeneHeader title={<span className="zene-logo"><ZeneIcon name="note" size={22} />zene</span>} isLarge />
			<div className="zene-scroll" data-zene-scroll="">
				{comingList.length > 0 ? (
					<div className="zene-story-row" data-zene-noswipe="">
						{comingList.map((event) => {
							const account = world.accountOfSubject('event', event.id);
							return (
								<button key={event.id} type="button" className="zene-story" onClick={() => app.eventOpen(event.id)} title={event.name}>
									{account ? <ZeneAvatar account={account} size={54} isRing /> : <span className="zene-avatar is-badge is-ring" style={{ width: 54, height: 54, background: '#e9ecef' }}><ZeneIcon name={event.eventKind === 'rehearsal' ? 'stand' : 'concert'} size={36} /></span>}
									<span className="zene-story-label">{event.eventKind === 'rehearsal' ? 'rehearsal' : event.name}</span>
									<span className="zene-story-date"><ZeneTime time={event.timeStart} part="date" isYearShown={false} /></span>
								</button>
							);
						})}
					</div>
				) : null}
				{feed.isEveryone ? <p className="zene-hint-line">{personId ? 'Follow people and groups to make this feed yours. Everything posted:' : 'Everything posted in the community. Sign in on the Me tab to take part.'}</p> : null}
				{feed.postList.length === 0 ? <ZeneEmpty text="Nothing posted yet." /> : null}
				{feed.postList.map((post) => <ZenePostCard key={post.id} app={app} world={world} post={post} />)}
			</div>
		</div>
	);
});

// --- Discover: the search -----------------------------------------------------------------------

const TAG_SHELF_LIST = [
	{ kind: 'skill', label: 'Instruments and skills' },
	{ kind: 'genre', label: 'Genres' },
	{ kind: 'work', label: 'Works' },
	{ kind: 'composer', label: 'Composers' },
];

export const ZeneScreenDiscover = observer(function ZeneScreenDiscover({ app }) {
	const world = app.world;
	const { search } = app.store;
	const isQuery = search.text.trim() !== '' || search.tagIdList.length > 0;
	const resultList = isQuery ? zeneSearch(world, search, { personId: app.store.actor.personId, time: app.time }) : [];
	const countByKind = Object.fromEntries(ZENE_SEARCH_KIND_LIST.map((one) => [one.id, isQuery ? zeneSearch(world, { ...search, kind: one.id }, { personId: app.store.actor.personId, time: app.time }).length : 0]));
	return (
		<div className="zene-screen">
			<ZeneHeader title="Discover" isLarge />
			<div className="zene-search-bar">
				<span className="zene-search-field">
					<Search size={15} />
					<input value={search.text} placeholder="people, groups, events, works" onChange={(event) => app.store.searchSet({ text: event.target.value })} aria-label="Search the community" />
					{search.text ? <button type="button" className="zene-search-clear" aria-label="Clear" onClick={() => app.store.searchSet({ text: '' })}><X size={14} /></button> : null}
				</span>
				{search.tagIdList.length > 0 ? (
					<div className="zene-chip-row is-filter">
						{search.tagIdList.map((id) => (
							<span key={id} className="zene-chip-removable">
								<ZeneTagChip world={world} tagId={id} size="s" />
								<button type="button" className="zene-chip-remove" aria-label="Remove the tag" onClick={() => app.store.searchTagToggle(id)}><X size={12} /></button>
							</span>
						))}
					</div>
				) : null}
				{isQuery ? (
					<div className="zene-segment is-small" role="radiogroup" aria-label="What to find" data-zene-noswipe="">
						<button type="button" role="radio" aria-checked={search.kind === ''} className={`zene-segment-item${search.kind === '' ? ' is-on' : ''}`} onClick={() => app.store.searchSet({ kind: '' })}>All</button>
						{ZENE_SEARCH_KIND_LIST.map((one) => (
							<button key={one.id} type="button" role="radio" aria-checked={search.kind === one.id} className={`zene-segment-item${search.kind === one.id ? ' is-on' : ''}`} onClick={() => app.store.searchSet({ kind: one.id })}>
								{one.label}<em>{countByKind[one.id]}</em>
							</button>
						))}
					</div>
				) : null}
			</div>
			<div className="zene-scroll" data-zene-scroll="">
				{isQuery ? (
					<div className="zene-row-list is-result">
						{resultList.length === 0 ? <ZeneEmpty icon="star" text="Nothing found. A tag finds everything below it: try a broader one." /> : null}
						{resultList.map((result) => <ZeneSearchResult key={`${result.kind}:${result.id}`} app={app} result={result} />)}
					</div>
				) : (
					TAG_SHELF_LIST.map((shelf) => {
						const tagList = world.tag.rootList(shelf.kind).filter((tag) => tag.kindList.includes(shelf.kind));
						const tagShownList = shelf.kind === 'skill' ? tagList.flatMap((tag) => [tag, ...world.tag.childList(tag.id)]).filter((tag, index, list) => list.indexOf(tag) === index) : tagList;
						return (
							<ZeneSection key={shelf.kind} title={shelf.label}>
								<div className="zene-tag-grid">
									{tagShownList.map((tag) => (
										<button key={tag.id} type="button" className="zene-tag-tile" onClick={() => app.tagOpen(tag.id)}>
											<ZeneIcon name={world.tag.iconOf(tag.id)} color={world.tag.colorOf(tag.id)} size={40} isSticker />
											<span className="zene-tag-tile-label">{tag.label}</span>
											<span className="zene-tag-tile-count">{zeneTagUseCount(world, tag.id)}</span>
										</button>
									))}
								</div>
							</ZeneSection>
						);
					})
				)}
			</div>
		</div>
	);
});

const ZeneSearchResult = observer(function ZeneSearchResult({ app, result }) {
	const world = app.world;
	const matched = result.tagMatchedList.map((id) => world.tag.get(id)?.label).filter(Boolean).join(', ');
	if (result.kind === 'event') return <ZeneEventRow app={app} world={world} event={result.entity} />;
	if (result.kind === 'hiring') {
		const post = result.entity;
		const account = world.get('account', post.account);
		return (
			<ZeneRow
				picture={<ZeneIcon name={world.tag.iconOf(post.hiring.tag)} color={world.tag.colorOf(post.hiring.tag)} size={38} isSticker />}
				title={`${world.tag.get(post.hiring.tag)?.label ?? 'someone'} wanted`}
				detail={`@${account?.handle ?? ''} · ${post.text}`}
				onOpen={() => app.push('post', { id: post.id })}
			/>
		);
	}
	const entity = result.entity;
	const detail = result.kind === 'individual'
		? [entity.skillList.slice(0, 3).map((one) => world.tag.get(one.tag)?.label).filter(Boolean).join(', '), entity.area].filter(Boolean).join(' · ')
		: [entity.area, matched ? `plays ${matched}` : ''].filter(Boolean).join(' · ');
	return <ZeneSubjectRow app={app} world={world} kind={result.kind} id={result.id} detail={detail} />;
});

// --- Activity: what waits for the person, and what they asked for -------------------------------

const SEGMENT_LIST = [{ id: 'decide', label: 'To decide' }, { id: 'sent', label: 'Sent' }];

export const ZeneScreenActivity = observer(function ZeneScreenActivity({ app }) {
	const world = app.world;
	const { personId } = app.store.actor;
	const inbox = zeneInbox(world, { personId, time: app.time });
	const segment = app.store.activitySegment;
	return (
		<div className="zene-screen">
			<ZeneHeader title="Activity" isLarge />
			{personId ? (
				<div className="zene-search-bar">
					<div className="zene-segment" role="radiogroup" aria-label="Which activity" data-zene-noswipe="">
						{SEGMENT_LIST.map((one) => (
							<button key={one.id} type="button" role="radio" aria-checked={segment === one.id} className={`zene-segment-item${segment === one.id ? ' is-on' : ''}`} onClick={() => app.store.activitySegmentSet(one.id)}>
								{one.label}{one.id === 'decide' && inbox.count > 0 ? <em className="is-alert">{inbox.count}</em> : null}{one.id === 'sent' ? <em>{inbox.sentList.length}</em> : null}
							</button>
						))}
					</div>
				</div>
			) : null}
			<div className="zene-scroll" data-zene-scroll="">
				{!personId ? <ZeneEmpty icon="bulb" text="Sign in to see the applications and invitations waiting for you." /> : null}
				{personId && segment === 'decide' ? (
					<>
						{inbox.count === 0 ? <ZeneEmpty icon="star" text="Nothing waits for you." /> : null}
						{inbox.decideList.length > 0 ? (
							<ZeneSection title="Applications" detail="to what you decide for">
								{inbox.decideList.map((application) => <ZeneApplicationCard key={application.id} app={app} application={application} isDecider />)}
							</ZeneSection>
						) : null}
						{inbox.inviteList.length > 0 ? (
							<ZeneSection title="Invitations">
								{inbox.inviteList.map(({ event, principal }) => (
									<div key={`${event.id}:${principal.kind}:${principal.id}`} className="zene-card">
										<p className="zene-card-text">
											<strong>{world.labelGet(principal.kind, principal.id)}</strong> is invited to <button type="button" className="zene-link" onClick={() => app.eventOpen(event.id)}>{event.name}</button> as {principal.role}.
										</p>
										<p className="zene-card-detail"><ZeneTime time={event.timeStart} /></p>
										<div className="zene-button-row">
											<ZeneActionButton app={app} actionId="event.inviteAnswer" input={{ event: event.id, principal, isAccepted: true }} label="Accept" tone="primary" isCompact />
											<ZeneActionButton app={app} actionId="event.inviteAnswer" input={{ event: event.id, principal, isAccepted: false }} label="Decline" isCompact />
										</div>
									</div>
								))}
							</ZeneSection>
						) : null}
					</>
				) : null}
				{personId && segment === 'sent' ? (
					inbox.sentList.length === 0 ? <ZeneEmpty icon="note" text="You have not applied to anything." /> : inbox.sentList.map((application) => <ZeneApplicationCard key={application.id} app={app} application={application} />)
				) : null}
			</div>
		</div>
	);
});

const APPLICATION_STATUS_TONE = { pending: 'is-warm', accepted: 'is-soft', declined: 'is-muted', withdrawn: 'is-muted' };

const ZeneApplicationCard = observer(function ZeneApplicationCard({ app, application, isDecider = false }) {
	const world = app.world;
	const applicant = world.get('individual', application.applicant);
	const applicantAccount = world.accountOfSubject('individual', application.applicant);
	const target = world.get(application.target.kind, application.target.id);
	const via = application.via ? world.get('post', application.via) : undefined;
	return (
		<div className="zene-card">
			<div className="zene-card-head">
				{isDecider ? <ZeneAvatar account={applicantAccount} size={32} /> : null}
				<p className="zene-card-text">
					{isDecider ? <><button type="button" className="zene-link" onClick={() => applicantAccount && app.accountOpen(applicantAccount.id)}>{applicant?.name ?? 'someone'}</button> applies to </> : <>To </>}
					<button type="button" className="zene-link" onClick={() => (application.target.kind === 'event' ? app.eventOpen(application.target.id) : app.subjectOpen(application.target.kind, application.target.id))}>{target?.name ?? 'something gone'}</button>
				</p>
				<span className={`zene-pill ${APPLICATION_STATUS_TONE[application.status]}`}>{application.status}</span>
			</div>
			{application.message ? <p className="zene-card-quote">{application.message}</p> : null}
			<div className="zene-chip-row">{application.skillList.map((id) => <ZeneTagChip key={id} world={world} tagId={id} size="s" />)}</div>
			<p className="zene-card-detail"><ZeneTime time={application.timeCreated} />{via ? <> · answering a hiring post</> : null}</p>
			{application.status === 'pending' ? (
				<div className="zene-button-row">
					{isDecider ? <ZeneActionButton app={app} actionId="application.accept" input={{ application: application.id }} label="Accept" tone="primary" isCompact /> : null}
					{isDecider ? <ZeneActionButton app={app} actionId="application.decline" input={{ application: application.id }} label="Decline" isCompact /> : null}
					{!isDecider ? <ZeneActionButton app={app} actionId="application.withdraw" input={{ application: application.id }} label="Withdraw" isCompact /> : null}
				</div>
			) : null}
		</div>
	);
});

// --- Me: the homepage of the account acted as, or signing in -------------------------------------

export const ZeneScreenMe = observer(function ZeneScreenMe({ app }) {
	const world = app.world;
	const { personId, accountId } = app.store.actor;
	const account = world.get('account', accountId);
	if (!personId || !account) return <ZeneScreenSignIn app={app} />;
	const manageList = zeneAccountManageList(world, personId, app.time);
	return (
		<div className="zene-screen">
			<ZeneHeader
				title={(
					<button type="button" className="zene-account-switch" onClick={() => app.store.menuSet('account')} aria-expanded={app.store.menu === 'account'} title="Act as another account you manage">
						{account.handle}{manageList.length > 1 ? <ChevronDown size={16} /> : null}
					</button>
				)}
				right={<button type="button" className="zene-icon-button" title="Sign out" onClick={() => app.store.signOut()}><LogOut size={17} /></button>}
			/>
			<div className="zene-scroll" data-zene-scroll="">
				{account.subject.kind !== 'individual' ? <p className="zene-hint-line">You act as {account.name}: posts, follows and events you make are its.</p> : null}
				<ZeneAccountView app={app} account={account} />
			</div>
		</div>
	);
});

// nobody is signed in: who holds the phone, or a new account
const ZeneScreenSignIn = observer(function ZeneScreenSignIn({ app }) {
	const world = app.world;
	const personList = world.list('individual').filter((one) => world.accountOfSubject('individual', one.id));
	return (
		<div className="zene-screen">
			<ZeneHeader title="Welcome" isLarge />
			<div className="zene-scroll" data-zene-scroll="">
				<div className="zene-welcome">
					<ZeneIcon name="choir" size={86} isSticker color="#fff1c1" />
					<p>Find a group to play with, and the events to play at.</p>
					<button type="button" className="zene-button is-primary is-wide" onClick={() => app.store.sheetOpen('register')}><UserPlus size={15} />Create an account</button>
				</div>
				<ZeneSection title="Sign in as" detail="the demonstration has no passwords">
					<div className="zene-row-list">
						{personList.map((person) => {
							const account = world.accountOfSubject('individual', person.id);
							return (
								<ZeneRow key={person.id}
									picture={<ZeneAvatar account={account} size={38} />}
									title={person.name}
									detail={`@${account.handle} · ${person.skillList.slice(0, 2).map((one) => world.tag.get(one.tag)?.label).filter(Boolean).join(', ') || person.roleList.map((one) => one.role).join(', ')}`}
									onOpen={() => { app.store.signIn(world, person.id); app.store.toastShow(`Signed in as ${person.name}`); }}
								/>
							);
						})}
					</div>
				</ZeneSection>
			</div>
		</div>
	);
});
