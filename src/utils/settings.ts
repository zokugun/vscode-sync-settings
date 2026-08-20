import type vscode from 'vscode';

import path from 'path';
import { err, OK, type Result, xtryAsync } from '@zokugun/xtry';
import fse from 'fs-extra';

import { unsafeCast } from './unsafe-cast.js';

export const CONFIG_KEY = 'syncSettings';

/* eslint-disable ts/naming-convention */
export let EXTENSION_ID: string = '';
export let EXTENSION_NAME: string = '';
export let GLOBAL_STORAGE: string = '';
export let TEMPORARY_DIR: string = '';
export let WORKSPACE_STORAGE: string | undefined;
/* eslint-enable ts/naming-convention */

let $context: vscode.ExtensionContext | null = null;

export function getContext(): vscode.ExtensionContext {
	return $context!;
}

export async function setupSettings(context: vscode.ExtensionContext): Promise<Result<void, string>> {
	EXTENSION_NAME = unsafeCast<{ displayName: string }>(context.extension.packageJSON).displayName;
	EXTENSION_ID = context.extension.id;
	GLOBAL_STORAGE = context.globalStorageUri.fsPath;
	TEMPORARY_DIR = path.join(GLOBAL_STORAGE, 'temp');
	WORKSPACE_STORAGE = context.storageUri?.fsPath;

	$context = context;

	const result = await xtryAsync(async () => fse.ensureDir(TEMPORARY_DIR));
	if(result.fails) {
		return err(`Cannot ensure the directory ${TEMPORARY_DIR}`);
	}

	return OK;
}
