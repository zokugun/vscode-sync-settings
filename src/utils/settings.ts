import path from 'path';
import fse from '@zokugun/fs-extra-plus/async';
import { err, OK, type Result } from '@zokugun/xtry';
import type vscode from 'vscode';

export const CONFIG_KEY = 'syncSettings';

/* eslint-disable import/no-mutable-exports, @typescript-eslint/naming-convention */
export let EXTENSION_ID: string = '';
export let EXTENSION_NAME: string = '';
export let GLOBAL_STORAGE: string = '';
export let TEMPORARY_DIR: string = '';
export let WORKSPACE_STORAGE: string | undefined;
/* eslint-enable */

export async function setupSettings(context: vscode.ExtensionContext): Promise<Result<void, string>> {
	EXTENSION_NAME = context.extension.packageJSON.displayName as string;
	EXTENSION_ID = context.extension.id;
	GLOBAL_STORAGE = context.globalStorageUri.fsPath;
	TEMPORARY_DIR = path.join(GLOBAL_STORAGE, 'temp');
	WORKSPACE_STORAGE = context.storageUri?.fsPath;

	const result = await fse.ensureDir(TEMPORARY_DIR);
	if(result.fails) {
		return err(`Cannot ensure the directory ${TEMPORARY_DIR}`);
	}

	return OK;
}
