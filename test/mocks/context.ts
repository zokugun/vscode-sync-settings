import { ExtensionContext } from 'vscode';
import { Uri } from './vscode/uri';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const context: ExtensionContext = {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	extension: {
		id: 'zokugun.sync-settings',
	} as any,
	subscriptions: [],
	globalStorageUri: Uri.file('/globalStorage/extension'),
} as any;
