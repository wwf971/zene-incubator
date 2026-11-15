import { observer } from 'mobx-react-lite';
import { timeTextDisplay } from '@wwf971/react-doc';
import { Check, CircleSlash, Database, RotateCcw, Smartphone, Upload } from 'lucide-react';
import { zeneAccountManageList } from '../model/ZeneRole.js';
import { ZeneAvatar } from './part/ZeneAvatar.jsx';

// Beside the phone: the session of the demonstration (doc/zene-ui.md#the-session). Who holds the phone
// (a tap on a face signs that person in, to try what each one may do), the partition the app reads,
// the changes of the session over it, and a log of every action run with what it did to the data
// items: created, updated, deleted. This is what turns the screens into a view of the semantic model.
export const ZeneSessionPanel = observer(function ZeneSessionPanel({ app, service }) {
	const { backend, store } = app;
	const world = app.world;
	const read = backend.baseRead;
	const partitionInfo = service?.partitionList?.find((one) => one.id === backend.partition);
	const personList = world.list('individual').filter((one) => world.accountOfSubject('individual', one.id));
	const { personId, accountId } = store.actor;
	const accountActing = world.get('account', accountId);
	const writeReason = !service ? 'the object is not read yet' : !service.isEditable ? service.editUnavailableReason : service.partitionWriteUnavailableReasonGet(backend.partition);
	const planCount = backend.changeCount > 0 ? backend.writePlanGet().length : 0;
	return (
		<aside className="zene-session" aria-label="The session of the demonstration">
			<section className="zene-session-part">
				<h4 className="zene-session-title"><Smartphone size={14} />Holding the phone</h4>
				<div className="zene-session-face-row">
					<button type="button" className={`zene-session-face is-nobody${personId ? '' : ' is-on'}`} title="Nobody: a visitor" aria-pressed={!personId} onClick={() => store.signOut()}>
						<CircleSlash size={18} />
					</button>
					{personList.map((person) => {
						const account = world.accountOfSubject('individual', person.id);
						return (
							<button key={person.id} type="button" className={`zene-session-face${person.id === personId ? ' is-on' : ''}`} title={`${person.name} (@${account.handle})`} aria-pressed={person.id === personId} onClick={() => store.signIn(world, person.id)}>
								<ZeneAvatar account={account} size={28} />
							</button>
						);
					})}
				</div>
				<p className="zene-session-line">
					{personId ? <>Signed in: <strong>{world.get('individual', personId)?.name}</strong>, acting as <strong>@{accountActing?.handle}</strong></> : 'Nobody is signed in: the app is browsed as a visitor.'}
				</p>
				{personId && zeneAccountManageList(world, personId, app.time).length > 1 ? (
					<div className="zene-session-chip-row">
						{zeneAccountManageList(world, personId, app.time).map((account) => (
							<button key={account.id} type="button" className="doc-button-dialog" aria-pressed={account.id === accountId} onClick={() => store.actAs(account.id)} title="Act as this account">@{account.handle}</button>
						))}
					</div>
				) : null}
			</section>
			<section className="zene-session-part">
				<h4 className="zene-session-title"><Database size={14} />Data</h4>
				<p className="zene-session-line">
					Partition <strong>{partitionInfo?.label ?? backend.partition}</strong>
					{partitionInfo ? <span className="doc-badge-outline">{partitionInfo.isGitIgnored ? 'kept out of git' : 'tracked by git'}</span> : null}
					{' '}{read.status === 'loading' ? `reading ${read.countRead} of ${read.countAll} items` : `${read.countAll} data items`}
				</p>
				<p className="zene-session-line">
					{backend.changeCount === 0 ? 'No change in this session.' : <><strong>{backend.changeCount}</strong> effect(s) in this session, kept in this browser over the partition ({planCount} item(s) to write).</>}
				</p>
				<div className="zene-session-chip-row">
					<button type="button" className="doc-button" disabled={backend.changeCount === 0 && backend.logList.length === 0} onClick={() => backend.discard()} title="Forget the changes and the log of this session">
						<RotateCcw size={12} />Discard
					</button>
					<button type="button" className="doc-button" data-primary="" disabled={backend.changeCount === 0 || Boolean(writeReason) || backend.write.isRunning} title={writeReason || 'Write each changed entity into its data item of the partition'} onClick={() => backend.partitionWrite()}>
						<Upload size={12} />{backend.write.isRunning ? `Writing ${backend.write.countDone} of ${backend.write.countAll}` : 'Write into the partition'}
					</button>
				</div>
				{backend.write.message ? <p className="zene-session-line is-muted">{backend.write.message}</p> : null}
				{world.problemList.length > 0 ? (
					<details className="zene-session-problem">
						<summary>{world.problemList.length} thing(s) in the data do not fit</summary>
						<ul>{world.problemList.slice(0, 30).map((one, index) => <li key={index}>{one}</li>)}</ul>
					</details>
				) : null}
			</section>
			<section className="zene-session-part is-log">
				<h4 className="zene-session-title">Actions run<span className="zene-session-count">{backend.logList.length}</span></h4>
				{backend.logList.length === 0 ? <p className="zene-session-line is-muted">Each action the app runs is listed here with the data items it created, updated or deleted. Try Follow, Apply, or a post.</p> : null}
				<ol className="zene-log">
					{backend.logList.map((entry) => (
						<li key={entry.seq} className={`zene-log-entry${entry.code === 0 ? '' : ' is-refused'}`}>
							<div className="zene-log-head">
								{entry.code === 0 ? <Check size={12} className="zene-log-mark" /> : <CircleSlash size={12} className="zene-log-mark" />}
								<code className="zene-log-action">{entry.actionId}</code>
								<span className="zene-log-actor">{entry.actorText}</span>
								<span className="zene-log-time">{timeTextDisplay(entry.time, { part: 'second', isYearShown: false })}</span>
							</div>
							{entry.code !== 0 ? <p className="zene-log-reason">refused ({entry.code}): {entry.message}</p> : null}
							{entry.effectList.map((effect, index) => (
								<p key={index} className="zene-log-effect" data-op={effect.op}>
									<span className="zene-log-op">{effect.op}</span>
									<span className="zene-log-kind">{effect.kind}</span>
									<span className="zene-log-label">{effect.label || effect.id}</span>
									{effect.fieldList.length > 0 ? <span className="zene-log-field">{effect.fieldList.join(', ')}</span> : null}
								</p>
							))}
						</li>
					))}
				</ol>
			</section>
		</aside>
	);
});
