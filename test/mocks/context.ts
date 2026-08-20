import type { ExtensionContext } from 'vscode';

import { Uri } from './vscode/uri.js';
import { unsafeCast } from '../../src/utils/unsafe-cast.js';

export const context = unsafeCast<ExtensionContext>({
	extension: {
		id: 'zokugun.sync-settings',
		extensionKind: 1,
	},
	globalStorageUri: Uri.file('/globalStorage/extension'),
	subscriptions: [],
});
