import { observer } from 'mobx-react-lite';
import { ZENE_ACTION_GROUP_LIST, ZENE_ACTION_LIST } from './model/ZeneAction.js';

// The mode Actions (doc/zene-action.md#the-catalog): the catalog of the model as a table, read from
// the actions themselves (model/ZeneAction.js), so the document and what the buttons do never part.
// It reads nothing of the object's data.
//
//   param.group   one group of actions (account, group, ...); absent, all
export const ZeneActionTable = observer(function ZeneActionTable({ data = {} }) {
	const groupWanted = data.param?.group ?? '';
	const groupList = ZENE_ACTION_GROUP_LIST.filter((group) => !groupWanted || group.id === groupWanted);
	return (
		<div className="zene-action-table not-prose">
			{groupList.map((group) => {
				const actionList = ZENE_ACTION_LIST.filter((action) => action.group === group.id);
				return (
					<section key={group.id} className="zene-action-group">
						<h4 className="zene-action-group-title">{group.label}<span>{actionList.length}</span></h4>
						<table className="zene-table">
							<thead>
								<tr><th>Action</th><th>Who may</th><th>Input</th><th>What it changes</th></tr>
							</thead>
							<tbody>
								{actionList.map((action) => (
									<tr key={action.id}>
										<td><strong>{action.label}</strong><code>{action.id}</code></td>
										<td>{action.whoText}</td>
										<td>{action.inputText}</td>
										<td>
											<ul className="zene-effect-list">
												{action.effectText.map((text) => <li key={text} data-op={text.split(' ')[0]}>{text}</li>)}
											</ul>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</section>
				);
			})}
		</div>
	);
});
