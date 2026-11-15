import { observer } from 'mobx-react-lite';
import { Briefcase, CalendarDays, Trash2 } from 'lucide-react';
import { ZeneAvatar } from './ZeneAvatar.jsx';
import { ZeneActionButton, ZeneMediaCover, ZeneTagChip, ZeneTagRow, ZeneTime } from './ZenePart.jsx';

// A post as the feed shows it (doc/zene-ui.md#home): who posted it and when, its pictures, its text,
// its tags; an announcement links its event; a hiring post says what it looks for and takes
// applications. What the person may do with it is asked of the actions.
export const ZenePostCard = observer(function ZenePostCard({ app, world, post }) {
	const account = world.get('account', post.account);
	const event = post.event ? world.get('event', post.event) : undefined;
	const hiringTarget = post.hiring ? world.get(post.hiring.target.kind, post.hiring.target.id) : undefined;
	const isManaged = app.backend.actionReasonGet('post.delete', app.store.actor, { post: post.id }) === '';
	return (
		<article className="zene-post" data-kind={post.postKind}>
			<header className="zene-post-head">
				<button type="button" className="zene-post-author" onClick={() => account && app.accountOpen(account.id)}>
					<ZeneAvatar account={account} size={34} isRing={post.postKind === 'announcement'} />
					<span className="zene-post-author-text">
						<strong>{account?.handle ?? 'unknown'}</strong>
						<span><ZeneTime time={post.timeCreated} isYearShown={false} />{post.postKind !== 'general' ? <span className="zene-pill">{post.postKind}</span> : null}</span>
					</span>
				</button>
				{isManaged ? (
					<button type="button" className="zene-icon-button" title="Delete this post (post.delete)" onClick={() => app.actionRun('post.delete', { post: post.id })}>
						<Trash2 size={15} />
					</button>
				) : null}
			</header>
			{post.media.length > 0 ? (
				<div className={`zene-post-media is-count-${Math.min(post.media.length, 2)}`}>
					{post.media.slice(0, 2).map((media, index) => <ZeneMediaCover key={index} media={media} isSmall={post.media.length > 1} />)}
				</div>
			) : null}
			{post.text ? <p className="zene-post-text">{post.text}</p> : null}
			{event ? (
				<button type="button" className="zene-post-link" onClick={() => app.eventOpen(event.id)}>
					<CalendarDays size={14} />
					<span>{event.name}</span>
					<ZeneTime time={event.timeStart} part="date" />
				</button>
			) : null}
			{post.hiring ? (
				<div className={`zene-hiring${post.hiring.isOpen ? '' : ' is-closed'}`}>
					<div className="zene-hiring-head">
						<Briefcase size={14} />
						<span>Looking for {post.hiring.count > 1 ? `${post.hiring.count} × ` : ''}</span>
						<ZeneTagChip world={world} tagId={post.hiring.tag} size="s" />
					</div>
					{hiringTarget ? <p className="zene-hiring-line">for {post.hiring.target.kind === 'group' ? 'the group' : 'the event'} <button type="button" className="zene-link" onClick={() => (post.hiring.target.kind === 'group' ? app.subjectOpen('group', hiringTarget.id) : app.eventOpen(hiringTarget.id))}>{hiringTarget.name}</button></p> : null}
					{post.hiring.requirement ? <p className="zene-hiring-line">{post.hiring.requirement}</p> : null}
					<div className="zene-button-row">
						{post.hiring.isOpen ? (
							<ZeneActionButton app={app} actionId="hiring.apply" input={{ post: post.id }} label="Apply" tone="primary" isCompact
								onDone={undefined}
							/>
						) : <span className="zene-pill is-muted">closed</span>}
						{post.hiring.isOpen && isManaged ? <ZeneActionButton app={app} actionId="post.hiringClose" input={{ post: post.id }} label="Close" isCompact /> : null}
						{post.hiring.isOpen ? <button type="button" className="zene-button is-compact is-ghost" onClick={() => app.store.sheetOpen('apply', { kind: 'post', id: post.id })}>Apply with a message</button> : null}
					</div>
				</div>
			) : null}
			<ZeneTagRow world={world} tagIdList={post.tagList} onOpen={(id) => app.tagOpen(id)} size="s" />
		</article>
	);
});
