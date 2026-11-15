// The frontend object as the app on the device sees it: the api of the object's mode that the app's
// backend reads (doc-page/comp-mdx/backend/ZeneBackendLocal.js: assetList, assetDataGet, assetTextGet),
// answered from the data built into the app (virtual:zene-community). Nothing is written back: what a
// person does on the device stays in the session of the backend, in this app's storage.

const WRITE_REASON = 'the app on the device holds the data built into it: nothing is written back';

export function zeneObjectStaticCreate(community) {
	const assetList = community.assetList.map(({ data, text, ...asset }) => asset);
	const contentByKey = new Map(community.assetList.map((one) => [one.key, one]));
	const partitionInfo = { id: community.partition, name: community.partition };
	return {
		ref: community.object.ref,
		object: { id: community.object.id, name: community.object.name, type: community.object.type },
		partitionDefault: partitionInfo,
		partitionList: [partitionInfo],
		isEditable: false,
		editUnavailableReason: WRITE_REASON,
		partitionWriteUnavailableReasonGet: () => WRITE_REASON,
		assetList: () => assetList,
		assetDataGet(key) {
			const one = contentByKey.get(key);
			return one?.data !== undefined ? { status: 'ready', data: one.data } : { status: 'error', message: `${key}: no data` };
		},
		assetTextGet(key) {
			const one = contentByKey.get(key);
			return typeof one?.text === 'string' ? { status: 'ready', text: one.text } : { status: 'error', message: `${key}: no text` };
		},
		// a homepage's links are resolved against no document: there is none on the device
		docPathGet: () => '',
	};
}
