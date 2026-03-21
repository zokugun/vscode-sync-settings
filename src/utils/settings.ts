import { OK, type Result } from '@zokugun/xtry';
import type vscode from 'vscode';

export const CONFIG_KEY = 'syncSettings';

/* eslint-disable import/no-mutable-exports, @typescript-eslint/naming-convention */
export let EXTENSION_ID: string = '';
export let EXTENSION_NAME: string = '';
export let GLOBAL_STORAGE: string = '';
export let WORKSPACE_STORAGE: string | undefined;
/* eslint-enable */

export async function setupSettings(context: vscode.ExtensionContext): Promise<Result<void, string>> {
	EXTENSION_NAME = context.extension.packageJSON.displayName as string;
	EXTENSION_ID = context.extension.id;
	GLOBAL_STORAGE = context.globalStorageUri.fsPath;
	WORKSPACE_STORAGE = context.storageUri?.fsPath;

	return OK;
}
