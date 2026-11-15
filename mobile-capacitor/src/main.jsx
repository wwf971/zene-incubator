import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import './device-base.css';
import '@doc-page/comp-mdx/Zene.css';
import './device.css';
import { ZeneDevice } from './ZeneDevice.jsx';

createRoot(document.getElementById('root')).render(<ZeneDevice />);
