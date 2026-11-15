import { observer } from 'mobx-react-lite';
import { ChevronRight, Search, X } from 'lucide-react';
import { ZeneIcon } from './ZeneIcon.jsx';
import { ZeneTagChip } from './ZenePart.jsx';

// The fields of the forms of the app (doc/zene-ui.md#forms): a form is a sheet of the phone, as a
// mobile app shows one, and its fields are those of a phone form. Each field reads and writes one
// key of a draft kept in the app store, so a sheet closed and opened again keeps what was typed.
//
//   draft      the observable draft (app.store.draftGet(key))
//   onChange   (change) => void: the draft changed, a key at a time

export const ZeneField = observer(function ZeneField({ label, draft, field, onChange, placeholder = '', hint = '', type = 'text', isMultiLine = false, rowCount = 4, suffix = '' }) {
	const value = draft[field] ?? '';
	return (
		<label className="zene-field">
			<span className="zene-field-label">{label}</span>
			<span className="zene-field-box">
				{isMultiLine ? (
					<textarea className="zene-field-input" rows={rowCount} value={value} placeholder={placeholder} onChange={(event) => onChange({ [field]: event.target.value })} />
				) : (
					<input className="zene-field-input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange({ [field]: event.target.value })} />
				)}
				{suffix ? <span className="zene-field-suffix">{suffix}</span> : null}
			</span>
			{hint ? <span className="zene-field-hint">{hint}</span> : null}
		</label>
	);
});

// one value among a few, as a segmented control with its label
export const ZeneSegment = observer(function ZeneSegment({ label, draft, field, onChange, optionList }) {
	const value = draft[field] ?? optionList[0]?.id;
	return (
		<div className="zene-field">
			<span className="zene-field-label">{label}</span>
			<div className="zene-segment" role="radiogroup" aria-label={label}>
				{optionList.map((option) => (
					<button key={option.id} type="button" role="radio" aria-checked={value === option.id} className={`zene-segment-item${value === option.id ? ' is-on' : ''}`} title={option.title} onClick={() => onChange({ [field]: option.id })}>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
});

export const ZeneToggle = observer(function ZeneToggle({ label, draft, field, onChange, hint = '' }) {
	const isOn = draft[field] === true;
	return (
		<button type="button" className="zene-toggle-row" role="switch" aria-checked={isOn} onClick={() => onChange({ [field]: !isOn })}>
			<span className="zene-toggle-text">
				<span className="zene-field-label">{label}</span>
				{hint ? <span className="zene-field-hint">{hint}</span> : null}
			</span>
			<span className={`zene-toggle${isOn ? ' is-on' : ''}`}><span /></span>
		</button>
	);
});

// Tags chosen from the DAG (doc/zene-ui.md#choosing-tags): typed words find a tag by its label or the
// labels above it ("strings vio" finds Violin, Viola); with nothing typed, the tags are walked from
// their roots, a folder at a time. The chosen ones stand above as chips.
//
//   kindList    the kinds of tags offered (skill, work, composer ...)
//   draft[field] the ids chosen;  isSingle: one at most
export const ZeneTagPicker = observer(function ZeneTagPicker({ world, label, draft, field, onChange, kindList, isSingle = false, hint = '' }) {
	const chosenList = draft[field] ?? [];
	const browseField = `${field}Browse`;
	const textField = `${field}Text`;
	const text = draft[textField] ?? '';
	const browseId = draft[browseField] ?? '';
	const isOfKind = (tag) => !kindList || tag.kindList.some((kind) => kindList.includes(kind));
	const toggle = (id) => {
		const next = chosenList.includes(id) ? chosenList.filter((one) => one !== id) : isSingle ? [id] : [...chosenList, id];
		onChange({ [field]: next });
	};
	let tagList;
	if (text.trim()) {
		const wordList = text.toLowerCase().split(/\s+/).filter(Boolean);
		tagList = world.list('tag').filter(isOfKind).filter((tag) => {
			const haystack = world.tag.chainUp(tag.id).map((one) => one.label.toLowerCase()).join(' ');
			return wordList.every((word) => haystack.includes(word));
		}).slice(0, 24);
	} else if (browseId) {
		tagList = world.tag.childList(browseId).filter(isOfKind);
	} else {
		tagList = world.list('tag').filter(isOfKind).filter((tag) => world.tag.upList(tag.id).every((edge) => edge.via === 'composer' || !isOfKind(world.tag.get(edge.id))));
	}
	const crumbList = browseId ? world.tag.chainUp(browseId).reverse() : [];
	return (
		<div className="zene-field">
			<span className="zene-field-label">{label}</span>
			{chosenList.length > 0 ? (
				<div className="zene-chip-row">
					{chosenList.map((id) => (
						<span key={id} className="zene-chip-removable">
							<ZeneTagChip world={world} tagId={id} size="s" />
							<button type="button" className="zene-chip-remove" aria-label="Remove" onClick={() => toggle(id)}><X size={12} /></button>
						</span>
					))}
				</div>
			) : null}
			<span className="zene-field-box is-search">
				<Search size={14} />
				<input className="zene-field-input" value={text} placeholder="find a tag" onChange={(event) => onChange({ [textField]: event.target.value })} />
			</span>
			{crumbList.length > 0 && !text ? (
				<div className="zene-tag-crumb">
					<button type="button" className="zene-link" onClick={() => onChange({ [browseField]: '' })}>All</button>
					{crumbList.map((tag) => (
						<span key={tag.id}><ChevronRight size={11} /><button type="button" className="zene-link" onClick={() => onChange({ [browseField]: tag.id })}>{tag.label}</button></span>
					))}
				</div>
			) : null}
			<div className="zene-tag-pick-list">
				{tagList.map((tag) => {
					const childCount = world.tag.childList(tag.id).filter(isOfKind).length;
					const isChosen = chosenList.includes(tag.id);
					return (
						<span key={tag.id} className={`zene-tag-pick${isChosen ? ' is-chosen' : ''}`}>
							<button type="button" className="zene-tag-pick-main" aria-pressed={isChosen} onClick={() => toggle(tag.id)}>
								<ZeneIcon name={world.tag.iconOf(tag.id)} color={world.tag.colorOf(tag.id)} size={22} isSticker />
								<span>{tag.label}</span>
							</button>
							{childCount > 0 && !text ? (
								<button type="button" className="zene-tag-pick-open" aria-label={`The tags below ${tag.label}`} onClick={() => onChange({ [browseField]: tag.id })}>
									{childCount}<ChevronRight size={12} />
								</button>
							) : null}
						</span>
					);
				})}
				{tagList.length === 0 ? <span className="zene-field-hint">no tag found</span> : null}
			</div>
			{hint ? <span className="zene-field-hint">{hint}</span> : null}
		</div>
	);
});
