import { observer } from 'mobx-react-lite';
import { Plus, X } from 'lucide-react';

// Editing a homepage where it is shown (doc/zene-ui.md#editing-a-homepage-in-place): in the edit mode
// of a homepage, a text becomes a field with the same size and look, a list item gets a button taking
// it out, a list gets a button adding to it. Nothing is written by these pieces: each change is
// handed to `onCommit`, which runs an action. While a field is typed in, its text is a draft of the
// app store (`inline:{key}`), so the field keeps it across renders and the data stays as it was until
// the text is committed (blur, Enter on one line); Escape gives the draft up.

export const ZeneInlineText = observer(function ZeneInlineText({ app, inputKey, value, isEditing, onCommit, placeholder = '', isMultiLine = false, className = '', type = 'text' }) {
	if (!isEditing) return value ? <span className={className}>{value}</span> : null;
	const draftKey = `inline:${inputKey}`;
	const draft = app.store.draftByKey[draftKey];
	const text = draft ? draft.text : String(value ?? '');
	const commit = () => {
		if (!draft) return;
		app.store.draftClear(draftKey);
		if (draft.text !== String(value ?? '')) onCommit(draft.text);
	};
	const props = {
		className: `zene-inline-input${className ? ` ${className}` : ''}`,
		value: text,
		placeholder,
		onChange: (event) => app.store.draftSet(draftKey, { text: event.target.value }),
		onBlur: commit,
		onKeyDown: (event) => {
			if (event.key === 'Escape') { app.store.draftClear(draftKey); event.currentTarget.blur(); }
			if (event.key === 'Enter' && (!isMultiLine || event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.blur(); }
		},
		'data-zene-noswipe': '',
	};
	return isMultiLine ? <textarea rows={1} {...props} /> : <input type={type} {...props} />;
});

// the button taking one item out of a list, beside the item, in edit mode
export function ZeneRemoveButton({ title, onClick }) {
	return (
		<button type="button" className="zene-remove-button" title={title} aria-label={title} onClick={(event) => { event.stopPropagation(); onClick(); }}>
			<X size={12} strokeWidth={2.6} />
		</button>
	);
}

// the button adding to a list, where the list ends, in edit mode
export function ZeneAddButton({ label, onClick, title = '' }) {
	return (
		<button type="button" className="zene-add-button" title={title || label} onClick={onClick}>
			<Plus size={13} strokeWidth={2.6} />{label}
		</button>
	);
}
