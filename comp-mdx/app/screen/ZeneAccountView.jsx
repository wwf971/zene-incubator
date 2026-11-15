import { observer } from 'mobx-react-lite';
import { MdxRenderer } from '@wwf971/react-doc';
import { CalendarDays, Grid3x3, Info, MoreHorizontal, Pencil, UserPlus, Users } from 'lucide-react';
import { ZENE_EVENT_ACCOUNT_KEEP_DAY } from '../../model/ZeneKind.js';
import { zeneAccountStat, zeneAccountStateText, zeneEventListOfSubject, zeneGroupListOfPerson, zeneMemberListOfGroup } from '../../model/ZeneQuery.js';
import { zeneEventManageIs, zeneEventParticipantIs, zeneGroupManageIs, zeneMembershipActiveGet, zeneMembershipRoleList } from '../../model/ZeneRole.js';
import { ZenePager } from '../ZeneSwipe.jsx';
import { ZeneAvatar } from '../part/ZeneAvatar.jsx';
import { ZeneIcon } from '../part/ZeneIcon.jsx';
import {
	amountText, ZeneActionButton, ZeneEmpty, ZeneEventRow, ZeneMediaCover, ZeneRow, ZeneSection, ZeneStat, ZeneSubjectRow, ZeneTagChip, ZeneTagRow, ZeneTime,
	ZeneTimeSpan, ZeneVenue,
} from '../part/ZenePart.jsx';

// The homepage of an account (doc/zene-ui.md#homepages): a header as a social app has it (the
// picture, the counts, the name, a short bio, what the person may do here), then its views. The
// first view is About, not a grid of pictures: what the data says of the person, the group or the
// event (what they play, when they are free, what they ask for, who takes part), and the homepage
// the account writes in Markdown. A swipe goes from view to view.

const VIEW_BY_ID = {
	about: { label: 'About', Icon: Info },
	post: { label: 'Posts', Icon: Grid3x3 },
	event: { label: 'Events', Icon: CalendarDays },
	group: { label: 'Groups', Icon: Users },
};

export const ZeneAccountView = observer(function ZeneAccountView({ app, account }) {
	const world = app.world;
	const subject = world.get(account.subject.kind, account.subject.id);
	const stat = zeneAccountStat(world, account);
	const viewList = (account.viewList.length > 0 ? account.viewList : ['about', 'post', 'event', 'group'])
		.filter((view) => view !== 'group' || account.subject.kind !== 'event');
	const view = app.store.viewGet(account.id, viewList);
	const stateText = zeneAccountStateText(account, app.time);
	const kind = account.subject.kind;
	const tagIdList = kind === 'individual' ? (subject?.skillList ?? []).filter((one) => one.isPrimary).map((one) => one.tag)
		: kind === 'group' ? (subject?.tagList ?? []).slice(0, 3) : (subject?.programList ?? []).map((one) => one.tag).slice(0, 3);
	return (
		<div className="zene-profile">
			<div className="zene-profile-head">
				<ZeneAvatar account={account} size={78} isRing={kind === 'event'} />
				<div className="zene-profile-stat-row">
					<ZeneStat value={stat.postCount} label="posts" onClick={() => app.store.viewSet(account.id, 'post')} />
					<ZeneStat value={stat.followerCount} label="followers" />
					{kind === 'individual' ? <ZeneStat value={stat.groupCount} label="groups" onClick={() => app.store.viewSet(account.id, 'group')} /> : null}
					{kind === 'group' ? <ZeneStat value={stat.memberCount} label="members" onClick={() => app.store.viewSet(account.id, 'group')} /> : null}
					{kind === 'event' ? <ZeneStat value={stat.principalCount} label="taking part" /> : null}
				</div>
			</div>
			<div className="zene-profile-name">
				<strong>{account.name}</strong>
				{stateText ? <span className="zene-pill is-muted" title={`An event account can be used until ${ZENE_EVENT_ACCOUNT_KEEP_DAY} days after its event`}>{stateText}</span> : null}
			</div>
			{kind === 'individual' && subject?.area ? <p className="zene-profile-line">{subject.area}</p> : null}
			{account.bio ? <p className="zene-profile-bio">{account.bio}</p> : null}
			<ZeneTagRow world={world} tagIdList={tagIdList} onOpen={(id) => app.tagOpen(id)} size="s" />
			<ZeneProfileButtonRow app={app} account={account} subject={subject} />
			<nav className="zene-view-tab-row" aria-label="Views of the homepage">
				{viewList.map((one) => {
					const { label, Icon } = VIEW_BY_ID[one];
					return (
						<button key={one} type="button" className={`zene-view-tab${one === view ? ' is-on' : ''}`} aria-pressed={one === view} title={label} onClick={() => app.store.viewSet(account.id, one)}>
							<Icon size={17} /><span>{label}</span>
						</button>
					);
				})}
			</nav>
			<ZenePager
				isHeightFollow
				index={viewList.indexOf(view)}
				onIndexChange={(index) => app.store.viewSet(account.id, viewList[index])}
				pageList={viewList.map((one) => ({ id: one, render: () => <ZeneAccountViewPage app={app} account={account} subject={subject} view={one} /> }))}
			/>
		</div>
	);
});

const ZeneAccountViewPage = observer(function ZeneAccountViewPage({ app, account, subject, view }) {
	if (!subject) return <ZeneEmpty text="What this account speaks for is gone." />;
	if (view === 'about') {
		if (account.subject.kind === 'individual') return <ZeneAboutPerson app={app} account={account} person={subject} />;
		if (account.subject.kind === 'group') return <ZeneAboutGroup app={app} account={account} group={subject} />;
		return <ZeneEventDetail app={app} event={subject} account={account} />;
	}
	if (view === 'post') return <ZenePostGrid app={app} account={account} />;
	if (view === 'event') return <ZeneEventList app={app} subject={account.subject} />;
	if (account.subject.kind === 'group') return <ZeneGroupMemberList app={app} group={subject} />;
	return <ZenePersonGroupList app={app} person={subject} />;
});

// what the person may do on a homepage: each button an action, greyed with its reason
const ZeneProfileButtonRow = observer(function ZeneProfileButtonRow({ app, account, subject }) {
	const world = app.world;
	const { personId, accountId } = app.store.actor;
	const follow = (world.followByFrom.get(accountId) ?? []).find((one) => one.to === account.id);
	const isOwn = account.id === accountId;
	const kind = account.subject.kind;
	const buttonList = [];
	if (isOwn && kind === 'individual') {
		buttonList.push(<button key="edit" type="button" className="zene-button" onClick={() => app.store.sheetOpen('profileEdit', { individual: subject.id })}><Pencil size={14} />Edit profile</button>);
	}
	if (!isOwn) {
		buttonList.push(follow
			? <ZeneActionButton key="unfollow" app={app} actionId="account.unfollow" input={{ account: account.id }} label="Following" />
			: <ZeneActionButton key="follow" app={app} actionId="account.follow" input={{ account: account.id }} label="Follow" tone="primary" Icon={UserPlus} />);
	}
	if (app.backend.actionReasonGet('homepage.write', app.store.actor, { account: account.id }) === '') {
		buttonList.push(<button key="homepage" type="button" className="zene-button" onClick={() => app.store.sheetOpen('homepageEdit', { account: account.id })}>Homepage</button>);
	}
	if (kind === 'group' && subject) {
		const membership = zeneMembershipActiveGet(world, personId, subject.id);
		if (membership) buttonList.push(<ZeneActionButton key="leave" app={app} actionId="group.leave" input={{ group: subject.id }} label="Leave" />);
		else if (subject.joinPolicy === 'open') buttonList.push(<ZeneActionButton key="join" app={app} actionId="group.join" input={{ group: subject.id }} label="Join" tone="primary" />);
		else if (subject.joinPolicy === 'apply') buttonList.push(<button key="apply" type="button" className="zene-button is-primary" disabled={Boolean(app.backend.actionReasonGet('group.apply', app.store.actor, { group: subject.id }, { isInputChecked: true }))} title={app.backend.actionReasonGet('group.apply', app.store.actor, { group: subject.id }, { isInputChecked: true }) || undefined} onClick={() => app.store.sheetOpen('apply', { kind: 'group', id: subject.id })}>Apply</button>);
		else buttonList.push(<span key="invite" className="zene-pill is-muted">members by invitation</span>);
		if (zeneGroupManageIs(world, personId, subject.id, app.time)) buttonList.push(<button key="edit" type="button" className="zene-button" onClick={() => app.store.sheetOpen('groupEdit', { group: subject.id })}><Pencil size={14} />Edit</button>);
	}
	if (kind === 'event' && subject) buttonList.push(...eventButtonList(app, subject));
	return <div className="zene-button-row is-profile">{buttonList}</div>;
});

function eventButtonList(app, event) {
	const world = app.world;
	const { personId } = app.store.actor;
	const list = [];
	if (event.status === 'published' && event.eventKind !== 'rehearsal' && !zeneEventParticipantIs(world, personId, event, app.time)) {
		const reason = app.backend.actionReasonGet('event.apply', app.store.actor, { event: event.id }, { isInputChecked: true });
		list.push(<button key="apply" type="button" className="zene-button is-primary" disabled={Boolean(reason)} title={reason || undefined} onClick={() => app.store.sheetOpen('apply', { kind: 'event', id: event.id })}>Take part</button>);
	}
	if (zeneEventManageIs(world, personId, event.id, app.time)) {
		if (event.status === 'draft') list.push(<ZeneActionButton key="publish" app={app} actionId="event.publish" input={{ event: event.id }} label="Publish" tone="primary" />);
		if (event.eventKind !== 'rehearsal') list.push(<button key="rehearsal" type="button" className="zene-button" onClick={() => app.store.sheetOpen('rehearsalCreate', { event: event.id })}>Add rehearsal</button>);
		list.push(<button key="invite" type="button" className="zene-button" onClick={() => app.store.sheetOpen('invite', { event: event.id })}>Invite</button>);
		list.push(<ZeneActionButton key="cancel" app={app} actionId="event.cancel" input={{ event: event.id }} label="Cancel event" tone="danger" />);
	}
	return list;
}

// --- About ------------------------------------------------------------------------------------

const DAY_LIST = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];

const ZeneAboutPerson = observer(function ZeneAboutPerson({ app, account, person }) {
	const world = app.world;
	const { availability, pricing } = person;
	return (
		<div className="zene-about">
			<ZeneSection title="Plays" detail={person.skillList.length ? '' : 'nothing yet'}>
				<div className="zene-skill-list">
					{person.skillList.map((skill) => (
						<div key={skill.tag} className="zene-skill">
							<ZeneTagChip world={world} tagId={skill.tag} onClick={(id) => app.tagOpen(id)} />
							<span className="zene-level" title={`level ${skill.level} of 5`}>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= skill.level ? 'is-on' : ''} />)}</span>
							{skill.yearStart ? <span className="zene-skill-year">since {skill.yearStart}</span> : null}
						</div>
					))}
				</div>
			</ZeneSection>
			<ZeneSection title="Roles">
				<ul className="zene-plain-list">
					{person.roleList.map((role, index) => (
						<li key={index}>
							<strong>{role.role === 'organizer' ? 'Organizer' : 'Practitioner'}</strong>
							{role.timeStart ? <> since <ZeneTime time={role.timeStart} part="date" /></> : null}
							{role.timeEnd ? <> until <ZeneTime time={role.timeEnd} part="date" /></> : null}
						</li>
					))}
				</ul>
			</ZeneSection>
			{person.lookingForList.length > 0 ? (
				<ZeneSection title="Looking for">
					<div className="zene-chip-row">{person.lookingForList.map((text) => <span key={text} className="zene-pill is-soft">{text}</span>)}</div>
				</ZeneSection>
			) : null}
			{availability.slotList.length > 0 || availability.note ? (
				<ZeneSection title="Available" detail={`times in ${availability.zone}`}>
					<div className="zene-week">
						{DAY_LIST.map(([day, label]) => {
							const slotList = availability.slotList.filter((one) => one.day === day);
							return (
								<div key={day} className={`zene-week-day${slotList.length ? ' is-free' : ''}`}>
									<span className="zene-week-label">{label}</span>
									{slotList.map((slot, index) => <span key={index} className="zene-week-slot">{slot.from}<br />{slot.to}</span>)}
								</div>
							);
						})}
					</div>
					{availability.note ? <p className="zene-note">{availability.note}</p> : null}
				</ZeneSection>
			) : null}
			<ZeneSection title="Pricing">
				<div className="zene-chip-row">
					<span className={`zene-pill${pricing.isPaidOk ? ' is-soft' : ' is-muted'}`}>{pricing.isPaidOk ? 'takes paid work' : 'no paid work'}</span>
					<span className={`zene-pill${pricing.isFreeOk ? ' is-soft' : ' is-muted'}`}>{pricing.isFreeOk ? 'plays for free too' : 'paid work only'}</span>
				</div>
				{pricing.itemList.length > 0 ? (
					<div className="zene-price-list">
						{pricing.itemList.map((item, index) => (
							<div key={index} className="zene-price">
								<span>{item.label}</span>
								<strong>{amountText(item.amount, item.currency)}</strong>
								<em>{item.unit}</em>
							</div>
						))}
					</div>
				) : null}
				{pricing.note ? <p className="zene-note">{pricing.note}</p> : null}
			</ZeneSection>
			{person.workTagList.length > 0 ? (
				<ZeneSection title="Works they love">
					<ZeneTagRow world={world} tagIdList={person.workTagList} onOpen={(id) => app.tagOpen(id)} size="s" />
				</ZeneSection>
			) : null}
			<ZeneHomepage app={app} account={account} />
		</div>
	);
});

const POLICY_TEXT = { open: 'anyone may join', apply: 'members apply, the managers decide', invite: 'members by invitation' };

const ZeneAboutGroup = observer(function ZeneAboutGroup({ app, account, group }) {
	const world = app.world;
	return (
		<div className="zene-about">
			{group.description ? <p className="zene-about-text">{group.description}</p> : null}
			<ZeneSection title="The group">
				<ul className="zene-plain-list">
					{group.area ? <li><strong>Where</strong> {group.area}</li> : null}
					{group.timeFounded ? <li><strong>Founded</strong> <ZeneTime time={group.timeFounded} part="date" /></li> : null}
					<li><strong>Joining</strong> {POLICY_TEXT[group.joinPolicy]}</li>
				</ul>
			</ZeneSection>
			{group.recruitList.length > 0 ? (
				<ZeneSection title="Looking for">
					<div className="zene-chip-row">{group.recruitList.map((one, index) => <ZeneTagChip key={index} world={world} tagId={one.tag} detail={one.count > 1 ? `× ${one.count}` : ''} onClick={(id) => app.tagOpen(id)} />)}</div>
				</ZeneSection>
			) : null}
			<ZeneSection title="Plays">
				<ZeneTagRow world={world} tagIdList={group.tagList} onOpen={(id) => app.tagOpen(id)} size="s" />
			</ZeneSection>
			<ZeneHomepage app={app} account={account} />
		</div>
	);
});

const STATUS_TEXT = { confirmed: '', invited: 'invited', declined: 'declined' };

// an event: when, where, what is played, who takes part, what it looks for, its rehearsals
export const ZeneEventDetail = observer(function ZeneEventDetail({ app, event, account }) {
	const world = app.world;
	const { personId } = app.store.actor;
	const parent = event.parent ? world.get('event', event.parent) : undefined;
	const rehearsalList = (world.eventByParent.get(event.id) ?? []).filter((one) => app.isEventVisible(one))
		.sort((a, b) => a.timeStart.localeCompare(b.timeStart));
	const isManaged = zeneEventManageIs(world, personId, event.id, app.time);
	return (
		<div className="zene-about">
			<div className="zene-event-card">
				<div className="zene-event-kind">
					<span className="zene-pill">{event.eventKind}</span>
					<span className={`zene-pill${event.isCommercial ? ' is-warm' : ' is-soft'}`}>{event.isCommercial ? 'commercial' : 'non-commercial'}</span>
					{event.status !== 'published' ? <span className="zene-pill is-muted">{event.status}</span> : null}
					{event.visibility === 'member' ? <span className="zene-pill is-muted">participants only</span> : null}
				</div>
				<p className="zene-event-when"><CalendarDays size={14} /><ZeneTimeSpan timeStart={event.timeStart} timeEnd={event.timeEnd} /></p>
				<p className="zene-event-where"><ZeneVenue venue={event.venue} /></p>
				{event.isCommercial && event.ticket.price ? <p className="zene-event-ticket">Ticket {amountText(event.ticket.price, event.ticket.currency)}{event.ticket.note ? `, ${event.ticket.note}` : ''}</p> : null}
				{parent ? <p className="zene-event-parent">A rehearsal of <button type="button" className="zene-link" onClick={() => app.eventOpen(parent.id)}>{parent.name}</button></p> : null}
			</div>
			{event.description ? <p className="zene-about-text">{event.description}</p> : null}
			{event.programList.length > 0 ? (
				<ZeneSection title="Program">
					<div className="zene-program">
						{event.programList.map((one, index) => (
							<div key={index} className="zene-program-item">
								<span className="zene-program-number">{index + 1}</span>
								<ZeneTagChip world={world} tagId={one.tag} onClick={(id) => app.tagOpen(id)} size="s" />
								{world.tag.get(one.tag)?.composerList.map((id) => <span key={id} className="zene-program-composer">{world.tag.get(id)?.label}</span>)}
								{one.note ? <em>{one.note}</em> : null}
							</div>
						))}
					</div>
				</ZeneSection>
			) : null}
			<ZeneSection title="Taking part">
				<div className="zene-row-list">
					{event.principalList.map((principal) => (
						<ZeneSubjectRow key={`${principal.kind}:${principal.id}`} app={app} world={world} kind={principal.kind} id={principal.id}
							detail={`${principal.role}${STATUS_TEXT[principal.status] ? `, ${STATUS_TEXT[principal.status]}` : ''}`}
							right={principal.status === 'invited' && app.backend.actionReasonGet('event.inviteAnswer', app.store.actor, { event: event.id, principal }) === '' ? (
								<span className="zene-button-row">
									<ZeneActionButton app={app} actionId="event.inviteAnswer" input={{ event: event.id, principal, isAccepted: true }} label="Accept" tone="primary" isCompact />
									<ZeneActionButton app={app} actionId="event.inviteAnswer" input={{ event: event.id, principal, isAccepted: false }} label="Decline" isCompact />
								</span>
							) : undefined}
						/>
					))}
				</div>
			</ZeneSection>
			{event.openList.length > 0 ? (
				<ZeneSection title="Open positions">
					<div className="zene-chip-row">{event.openList.map((one, index) => <ZeneTagChip key={index} world={world} tagId={one.tag} detail={`× ${one.count}`} onClick={(id) => app.tagOpen(id)} />)}</div>
					{event.openList.some((one) => one.note) ? <p className="zene-note">{event.openList.map((one) => one.note).filter(Boolean).join('; ')}</p> : null}
				</ZeneSection>
			) : null}
			{rehearsalList.length > 0 || (isManaged && event.eventKind !== 'rehearsal') ? (
				<ZeneSection title="Rehearsals" detail="seen by those taking part">
					<div className="zene-row-list">{rehearsalList.map((one) => <ZeneEventRow key={one.id} app={app} world={world} event={one} />)}</div>
					{rehearsalList.length === 0 ? <p className="zene-note">None yet.</p> : null}
				</ZeneSection>
			) : null}
			{!account ? <div className="zene-button-row">{eventButtonList(app, event)}</div> : null}
			{account ? <ZeneHomepage app={app} account={account} /> : null}
		</div>
	);
});

// the homepage the account writes: a document of the object, rendered by the page as any Markdown
const ZeneHomepage = observer(function ZeneHomepage({ app, account }) {
	const page = account.homepage ? app.world.get('page', account.homepage) : undefined;
	const isWritable = app.backend.actionReasonGet('homepage.write', app.store.actor, { account: account.id }) === '';
	if (!page?.text) {
		return isWritable ? (
			<ZeneSection title="Homepage">
				<button type="button" className="zene-button is-ghost" onClick={() => app.store.sheetOpen('homepageEdit', { account: account.id })}>Write your homepage</button>
			</ZeneSection>
		) : null;
	}
	return (
		<ZeneSection title="Homepage" right={isWritable ? <button type="button" className="zene-icon-button" title="Edit the homepage" onClick={() => app.store.sheetOpen('homepageEdit', { account: account.id })}><Pencil size={14} /></button> : null}>
			<MdxRenderer data={{ source: page.text }} config={{ sourcePath: app.pageDocPathGet(page.id), className: 'zene-homepage prose' }} />
		</ZeneSection>
	);
});

// --- Posts, Events, Groups -----------------------------------------------------------------------

const ZenePostGrid = observer(function ZenePostGrid({ app, account }) {
	const postList = [...(app.world.postByAccount.get(account.id) ?? [])].sort((a, b) => b.timeCreated.localeCompare(a.timeCreated));
	if (postList.length === 0) return <ZeneEmpty icon="note" text="No posts yet." />;
	return (
		<div className="zene-post-grid">
			{postList.map((post) => (
				<button key={post.id} type="button" className="zene-post-tile" onClick={() => app.push('post', { id: post.id })} title={post.text}>
					{post.media[0] ? <ZeneMediaCover media={post.media[0]} isSmall /> : <span className="zene-post-tile-text">{post.text}</span>}
					{post.postKind === 'hiring' ? <span className="zene-post-tile-mark">hiring</span> : null}
				</button>
			))}
		</div>
	);
});

const ZeneEventList = observer(function ZeneEventList({ app, subject }) {
	const { comingList, pastList } = zeneEventListOfSubject(app.world, subject, { personId: app.store.actor.personId, time: app.time });
	if (comingList.length + pastList.length === 0) return <ZeneEmpty icon="concert" text="No events." />;
	return (
		<div className="zene-about">
			{comingList.length > 0 ? <ZeneSection title="Coming"><div className="zene-row-list">{comingList.map((one) => <ZeneEventRow key={one.id} app={app} world={app.world} event={one} />)}</div></ZeneSection> : null}
			{pastList.length > 0 ? <ZeneSection title="Past"><div className="zene-row-list">{pastList.map((one) => <ZeneEventRow key={one.id} app={app} world={app.world} event={one} />)}</div></ZeneSection> : null}
		</div>
	);
});

export function roleTextOf(world, roleList) {
	return roleList.map((role) => (role === 'owner' || role === 'admin' ? role : world.tag.get(role)?.label ?? role)).join(', ');
}

// the groups of a person, with the roles held in each, now and before
const ZenePersonGroupList = observer(function ZenePersonGroupList({ app, person }) {
	const world = app.world;
	const list = zeneGroupListOfPerson(world, person.id);
	if (list.length === 0) return <ZeneEmpty icon="group" text="In no group yet." />;
	return (
		<div className="zene-row-list">
			{list.map(({ membership, group }) => {
				const roleNow = roleTextOf(world, zeneMembershipRoleList(membership, app.time));
				const roleBefore = membership.roleList.filter((one) => one.timeEnd).map((one) => roleTextOf(world, [one.role])).join(', ');
				const isActive = membership.status === 'active';
				return (
					<ZeneSubjectRow key={membership.id} app={app} world={world} kind="group" id={group.id}
						detail={<>
							{isActive ? <>member since <ZeneTime time={membership.timeJoined} part="date" /></> : <>{membership.status}, <ZeneTime time={membership.timeJoined} part="date" /> – <ZeneTime time={membership.timeEnded} part="date" /></>}
							{roleNow ? <span className="zene-role-line">{roleNow}</span> : null}
							{roleBefore ? <span className="zene-role-line is-muted">before: {roleBefore}</span> : null}
						</>}
					/>
				);
			})}
		</div>
	);
});

// the members of a group, its subgroups; a manager opens a member to give roles
const ZeneGroupMemberList = observer(function ZeneGroupMemberList({ app, group }) {
	const world = app.world;
	const memberList = zeneMemberListOfGroup(world, group.id, app.time);
	const subgroupList = world.subgroupByGroup.get(group.id) ?? [];
	const isManaged = zeneGroupManageIs(world, app.store.actor.personId, group.id, app.time);
	const isMember = Boolean(zeneMembershipActiveGet(world, app.store.actor.personId, group.id));
	return (
		<div className="zene-about">
			<ZeneSection title="Members" detail={String(memberList.length)}>
				<div className="zene-row-list">
					{memberList.map(({ membership, individual }) => (
						<ZeneSubjectRow key={membership.id} app={app} world={world} kind="individual" id={individual.id}
							detail={[roleTextOf(world, zeneMembershipRoleList(membership, app.time)), membership.skillList.map((id) => world.tag.get(id)?.label).filter(Boolean).join(', ')].filter(Boolean).join(' · ') || 'member'}
							right={isManaged ? <button type="button" className="zene-icon-button" title="Roles of this member" onClick={(event) => { event.stopPropagation(); app.store.sheetOpen('member', { membership: membership.id }); }}><MoreHorizontal size={16} /></button> : undefined}
						/>
					))}
				</div>
			</ZeneSection>
			<ZeneSection title="Subgroups" detail={String(subgroupList.length)}>
				<div className="zene-row-list">
					{subgroupList.map((subgroup) => (
						<ZeneRow key={subgroup.id}
							picture={<ZeneIcon name={world.tag.iconOf(subgroup.tagList[0]) || 'group'} color={world.tag.colorOf(subgroup.tagList[0])} size={38} isSticker />}
							title={subgroup.name}
							detail={`${subgroup.memberList.length} ${subgroup.memberList.length === 1 ? 'member' : 'members'} · ${subgroup.joinPolicy === 'open' ? 'open to members' : 'by its leads'}`}
							onOpen={() => app.push('subgroup', { id: subgroup.id })}
						/>
					))}
				</div>
				{isMember ? <button type="button" className="zene-button is-ghost" onClick={() => app.store.sheetOpen('subgroupCreate', { group: group.id })}>Form a subgroup</button> : null}
			</ZeneSection>
		</div>
	);
});
