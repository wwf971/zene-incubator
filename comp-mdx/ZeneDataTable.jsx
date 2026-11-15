import { useLayoutEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useCompState } from '@wwf971/react-doc';
import { ZENE_KIND_LIST, zeneEntityNameGet, zeneEntityPathBuild } from './model/ZeneKind.js';
import { zeneBackendEnsure } from './backend/ZeneBackendLocal.js';

// The mode Data items (doc/zene-data.md): the entities of one partition by kind, as the app sees
// them: the items of the partition with the session over them. Each row is one data item (its asset
// path, its name, the fields that say most of it); what the session created, changed or deleted is
// marked. It shares the session of the App blocks of the same partition on the page.
//
//   param.partition   the partition; absent, the default one
//   param.kind        the kind shown first
export const ZeneDataTable = observer(function ZeneDataTable({ data = {}, config = {} }) {
	const service = config.objectFrontend;
	const param = data.param ?? {};
	const partition = param.partition || service?.partitionDefault?.id || 'example';
	const backend = zeneBackendEnsure({ storageKey: `zene:${service?.ref ?? ''}:${partition}:session`, partition, timeStart: param.time ?? '' });
	useLayoutEffect(() => { backend.serviceSet(service); }, [backend, service]);
	const state = useCompState(config, { kind: param.kind ?? 'individual' });
	const kind = state.value.kind;
	const world = backend.world;
	const changeByKey = new Map(backend.changeList.map((change) => [`${change.kind}:${change.id}`, change.op]));
	const baseKeySet = new Set(backend.baseRead.entryList.map((entry) => `${entry.kind}:${entry.data.id}`));
	const deletedList = backend.changeList.filter((change) => change.op === 'delete' && change.kind === kind && baseKeySet.has(`${change.kind}:${change.id}`));
	const entityList = world.list(kind);
	return (
		<div className="zene-data not-prose">
			<div className="zene-data-kind-row" role="tablist" aria-label="Kinds of data items">
				{ZENE_KIND_LIST.map((one) => (
					<button key={one.id} type="button" role="tab" aria-selected={one.id === kind} className="doc-button-dialog" aria-pressed={one.id === kind} onClick={() => state.patch({ kind: one.id })}>
						{one.label}<span className="zene-data-count">{world.count(one.id)}</span>
					</button>
				))}
			</div>
			<p className="zene-data-line">
				Partition <strong>{partition}</strong>: {backend.baseRead.countAll} data items{backend.changeCount > 0 ? `, with ${backend.changeCount} effect(s) of the session over them` : ''}.
				Paths are /{partition}/{kind}/{'{id}'}.
			</p>
			<div className="zene-data-scroll">
				<table className="zene-table">
					<thead><tr><th>Path</th><th>Name</th><th>Says</th><th>Session</th></tr></thead>
					<tbody>
						{entityList.map((entity) => {
							const op = changeByKey.get(`${kind}:${entity.id}`);
							const isCreated = op && !baseKeySet.has(`${kind}:${entity.id}`);
							return (
								<tr key={entity.id} data-op={isCreated ? 'create' : op ?? ''}>
									<td className="zene-data-path">{zeneEntityPathBuild(partition, kind, entity.id)}</td>
									<td>{zeneEntityNameGet(world, kind, entity)}</td>
									<td className="zene-data-says">{entitySayText(world, kind, entity)}</td>
									<td>{isCreated ? 'created' : op ? 'updated' : ''}</td>
								</tr>
							);
						})}
						{deletedList.map((change) => (
							<tr key={change.id} data-op="delete">
								<td className="zene-data-path">{zeneEntityPathBuild(partition, kind, change.id)}</td>
								<td colSpan={2}>deleted in the session</td>
								<td>deleted</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
});

// the few fields that say most of an entity
function entitySayText(world, kind, entity) {
	const label = (id) => world.tag.get(id)?.label ?? world.labelGet('individual', id) ?? id;
	switch (kind) {
		case 'account': return `${entity.subject.kind} ${world.labelGet(entity.subject.kind, entity.subject.id)}${entity.isTemporary ? ', temporary' : ''}`;
		case 'individual': return entity.skillList.map((one) => `${label(one.tag)} ${one.level}`).join(', ');
		case 'group': return `${entity.joinPolicy}; ${entity.tagList.map(label).join(', ')}`;
		case 'membership': return [entity.status, entity.roleList.map((one) => `${one.role === 'owner' || one.role === 'admin' ? one.role : label(one.role)}${one.timeEnd ? ' (ended)' : ''}`).join(', ')].filter(Boolean).join('; ');
		case 'subgroup': return `${world.labelGet('group', entity.group)}; ${entity.memberList.length} members`;
		case 'event': return `${entity.eventKind}, ${entity.status}, ${entity.isCommercial ? 'commercial' : 'non-commercial'}; ${entity.principalList.map((one) => `${world.labelGet(one.kind, one.id)} (${one.role}${one.status !== 'confirmed' ? `, ${one.status}` : ''})`).join(', ')}`;
		case 'post': return `${entity.postKind}${entity.hiring ? `: ${label(entity.hiring.tag)} for ${world.labelGet(entity.hiring.target.kind, entity.hiring.target.id)}${entity.hiring.isOpen ? '' : ' (closed)'}` : ''}`;
		case 'application': return `${entity.status}; ${entity.skillList.map(label).join(', ')}`;
		case 'follow': return '';
		case 'tag': return `${entity.kindList.join(', ')}${entity.parentList.length ? `; below ${entity.parentList.map(label).join(', ')}` : ''}${entity.composerList.length ? `; by ${entity.composerList.map(label).join(', ')}` : ''}${entity.originList.length ? `; from ${entity.originList.map(label).join(', ')}` : ''}`;
		case 'page': return `${entity.text.length} characters`;
		default: return '';
	}
}
