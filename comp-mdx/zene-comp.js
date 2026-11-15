import { compDefine } from '@wwf971/react-doc';
import { ZeneActionTable } from './ZeneActionTable.jsx';
import { ZeneApp } from './app/ZeneApp.jsx';
import { ZeneDataTable } from './ZeneDataTable.jsx';
import './Zene.css';

// the modes of a music community (type.yaml), never written as blocks themselves (doc/README.md)
const modeDefine = (label, description) => ({ placementList: ['objectFrontend'], expose: { meta: { label, description, isNotInDoc: true } } });

export const ZeneAppDefine = compDefine(ZeneApp, modeDefine('Zene: the app', 'The app on a simulated phone, beside the session of the demonstration'));
export const ZeneActionTableDefine = compDefine(ZeneActionTable, modeDefine('Zene: actions', 'The catalog of actions: who may, what each changes'));
export const ZeneDataTableDefine = compDefine(ZeneDataTable, modeDefine('Zene: data items', 'The data items of a partition by kind, with the session over them'));
