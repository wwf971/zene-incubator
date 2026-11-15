import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { zeneCommunityPlugin } from './script-build/vite-plugin-zene-community.js';

// The app of the doc page built as a plain web app, which Capacitor puts into an Android app
// (doc-page/doc/zene-deploy-mobile-capacitor.md). The components are the doc page's own files, read
// where they are (@doc-page); what they import from react-doc is answered by src/react-doc-host.jsx.
const here = path.dirname(fileURLToPath(import.meta.url));
const docPage = path.resolve(here, '../doc-page');

export default defineConfig({
	// the files are loaded from the app's own origin, at any path
	base: './',
	plugins: [react(), zeneCommunityPlugin({ docPage })],
	resolve: {
		alias: [
			{ find: /^@wwf971\/react-doc$/, replacement: path.join(here, 'src/react-doc-host.jsx') },
			{ find: /^@doc-page\//, replacement: `${docPage}/` },
		],
		// the doc page's files lie outside this folder, where no node_modules of this app is found by
		// walking up: the packages they import are taken from here, one copy of each
		dedupe: ['react', 'react-dom', 'mobx', 'mobx-react-lite', 'lucide-react'],
	},
	server: {
		fs: { allow: [here, docPage] },
	},
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		chunkSizeWarningLimit: 1500,
	},
});
