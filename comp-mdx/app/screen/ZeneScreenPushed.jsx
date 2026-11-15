import { observer } from 'mobx-react-lite';
import { Filter } from 'lucide-react';
import { zeneSearch } from '../../model/ZeneQuery.js';
import { zeneGroupManageIs, zeneMembershipActiveGet } from '../../model/ZeneRole.js';
import { ZeneIcon } from '../part/ZeneIcon.jsx';
import { ZeneActionButton, ZeneEmpty, ZeneEventRow, ZeneHeader, ZeneSection, ZeneSubjectRow, ZeneTagChip, ZeneTagRow } from '../part/ZenePart.jsx';
import { ZenePostCard } from '../part/ZenePostCard.jsx';
import { ZeneAccountView, ZeneEventDetail } from './ZeneAccountView.jsx';

// The screens pushed on a tab (doc/zene-ui.md#screens): an account, an event without one, a post, a
// tag, a subgroup. Each names what it shows by id (param.id), so a screen whose entity is gone says
// so instead of showing nothing.

export const ZeneScreenPushed = observer(function ZeneScreenPushed({ app, screen, param }) {
	const onBack = () => app.store.pop();
	const world = app.world;
	if (screen === 'account') {
		const account = world.get('account', param.id);
		return (
			<div className="zene-screen">
				<ZeneHeader title={account ? account.handle : 'Account'} onBack={onBack} />
				<div className="zene-scroll" data-zene-scroll="">{account ? <ZeneAccountView app={app} account={account} /> : <ZeneEmpty text="This account is gone." />}</div>
			</div>
		);
	}
	if (screen === 'event') {
		const event = world.get('event', param.id);
		return (
			<div className="zene-screen">
				<ZeneHeader title={event?.name ?? 'Event'} onBack={onBack} />
				<div className="zene-scroll" data-zene-scroll="">
					{!event ? <ZeneEmpty text="This event is gone." /> : !app.isEventVisible(event) ? <ZeneEmpty icon="stand" text="Only those taking part see this event." /> : <ZeneEventDetail app={app} event={event} />}
				</div>
			</div>
		);
	}
	if (screen === 'post') {
		const post = world.get('post', param.id);
		return (
			<div className="zene-screen">
				<ZeneHeader title="Post" onBack={onBack} />
				<div className="zene-scroll" data-zene-scroll="">{post ? <ZenePostCard app={app} world={world} post={post} /> : <ZeneEmpty text="This post was deleted." />}</div>
			</div>
		);
	}
	if (screen === 'tag') return <ZeneScreenTag app={app} tagId={param.id} onBack={onBack} />;
	if (screen === 'subgroup') return <ZeneScreenSubgroup app={app} subgroupId={param.id} onBack={onBack} />;
	return <div className="zene-screen"><ZeneHeader title="?" onBack={onBack} /></div>;
});

// a tag: where it stands in the DAG, the tags below it, and everything found by it
const ZeneScreenTag = observer(function ZeneScreenTag({ app, tagId, onBack }) {
	const world = app.world;
	const tag = world.tag.get(tagId);
	if (!tag) return <div className="zene-screen"><ZeneHeader title="Tag" onBack={onBack} /><ZeneEmpty text="This tag is gone." /></div>;
	const upList = world.tag.upList(tagId);
	const childList = world.tag.childList(tagId);
	const workList = world.tag.downList(tagId).filter((edge) => edge.via === 'composer').map((edge) => world.tag.get(edge.id)).filter(Boolean);
	const resultList = zeneSearch(world, { tagIdList: [tagId] }, { personId: app.store.actor.personId, time: app.time });
	const isFiltered = app.store.search.tagIdList.includes(tagId);
	const sectionList = [
		{ kind: 'individual', label: 'People' },
		{ kind: 'group', label: 'Groups' },
		{ kind: 'event', label: 'Events' },
		{ kind: 'hiring', label: 'Hiring' },
	];
	return (
		<div className="zene-screen">
			<ZeneHeader title={tag.label} onBack={onBack} />
			<div className="zene-scroll" data-zene-scroll="">
				<div className="zene-tag-hero">
					<ZeneIcon name={world.tag.iconOf(tagId)} color={world.tag.colorOf(tagId)} size={88} isSticker />
					<div>
						<strong>{tag.label}</strong>
						<span className="zene-tag-hero-kind">{tag.kindList.join(', ')}</span>
						{tag.note ? <span className="zene-tag-hero-note">{tag.note}</span> : null}
					</div>
				</div>
				<div className="zene-button-row">
					<button type="button" className={`zene-button${isFiltered ? '' : ' is-primary'}`} onClick={() => { app.store.searchTagToggle(tagId); if (!isFiltered) app.store.tabSet('discover'); }}>
						<Filter size={14} />{isFiltered ? 'Remove from the search' : 'Search with this tag'}
					</button>
				</div>
				{upList.length > 0 ? (
					<ZeneSection title="Above it">
						<div className="zene-chip-row">{upList.map((edge) => <ZeneTagChip key={edge.id} world={world} tagId={edge.id} detail={edge.via === 'parent' ? '' : edge.via === 'composer' ? 'composer' : 'from'} onClick={(id) => app.tagOpen(id)} size="s" />)}</div>
					</ZeneSection>
				) : null}
				{childList.length > 0 ? (
					<ZeneSection title="Below it">
						<ZeneTagRow world={world} tagIdList={childList.map((one) => one.id)} onOpen={(id) => app.tagOpen(id)} size="s" />
					</ZeneSection>
				) : null}
				{workList.length > 0 ? (
					<ZeneSection title="Works">
						<ZeneTagRow world={world} tagIdList={workList.map((one) => one.id)} onOpen={(id) => app.tagOpen(id)} size="s" />
					</ZeneSection>
				) : null}
				{resultList.length === 0 ? <ZeneEmpty icon="star" text="Nothing uses this tag yet." /> : null}
				{sectionList.map((section) => {
					const list = resultList.filter((one) => one.kind === section.kind);
					if (list.length === 0) return null;
					return (
						<ZeneSection key={section.kind} title={section.label} detail={String(list.length)}>
							<div className="zene-row-list">
								{list.map((result) => (result.kind === 'event'
									? <ZeneEventRow key={result.id} app={app} world={world} event={result.entity} />
									: result.kind === 'hiring'
										? <ZenePostCard key={result.id} app={app} world={world} post={result.entity} />
										: <ZeneSubjectRow key={result.id} app={app} world={world} kind={result.kind} id={result.id} detail={result.entity.area} />))}
							</div>
						</ZeneSection>
					);
				})}
			</div>
		</div>
	);
});

const ZeneScreenSubgroup = observer(function ZeneScreenSubgroup({ app, subgroupId, onBack }) {
	const world = app.world;
	const subgroup = world.get('subgroup', subgroupId);
	if (!subgroup) return <div className="zene-screen"><ZeneHeader title="Subgroup" onBack={onBack} /><ZeneEmpty text="This subgroup is gone." /></div>;
	const group = world.get('group', subgroup.group);
	const { personId } = app.store.actor;
	const isIn = subgroup.memberList.some((one) => one.individual === personId);
	const isGroupMember = Boolean(zeneMembershipActiveGet(world, personId, subgroup.group));
	return (
		<div className="zene-screen">
			<ZeneHeader title={subgroup.name} subtitle={group?.name} onBack={onBack} />
			<div className="zene-scroll" data-zene-scroll="">
				<div className="zene-about">
					{subgroup.description ? <p className="zene-about-text">{subgroup.description}</p> : null}
					<ZeneTagRow world={world} tagIdList={subgroup.tagList} onOpen={(id) => app.tagOpen(id)} size="s" />
					<p className="zene-note">A subgroup of <button type="button" className="zene-link" onClick={() => app.subjectOpen('group', subgroup.group)}>{group?.name}</button>: {subgroup.joinPolicy === 'open' ? 'its members join it themselves' : 'its leads add its members'}.</p>
					<div className="zene-button-row">
						{isIn ? <ZeneActionButton app={app} actionId="subgroup.leave" input={{ subgroup: subgroup.id }} label="Leave the subgroup" /> : null}
						{!isIn && isGroupMember ? <ZeneActionButton app={app} actionId="subgroup.join" input={{ subgroup: subgroup.id }} label="Join the subgroup" tone="primary" /> : null}
						{!isGroupMember && !zeneGroupManageIs(world, personId, subgroup.group, app.time) ? <span className="zene-pill is-muted">for members of the group</span> : null}
					</div>
					<ZeneSection title="Members" detail={String(subgroup.memberList.length)}>
						<div className="zene-row-list">
							{subgroup.memberList.map((one) => <ZeneSubjectRow key={one.individual} app={app} world={world} kind="individual" id={one.individual} detail={one.role} />)}
						</div>
					</ZeneSection>
				</div>
			</div>
		</div>
	);
});
