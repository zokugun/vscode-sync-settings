import os from 'os';
import path from 'path';
import process from 'process';
import { transform } from '@daiyam/jsonc-preprocessor';
import vscode from 'vscode';
import { type Settings } from '../settings.js';
import { getEditorStorage } from './get-editor-storage.js';
import { hostname } from './hostname.js';

const TYPES = {
	version: 'version',
};

const EDITOR = getCurrentEditor();
const OS = getCurrentOs();

function getCurrentEditor(): string {
	return vscode.env.appName.toLocaleLowerCase();
}

function getCurrentOs(): string {
	if(process.platform === 'win32') {
		return 'windows';
	}
	else if(process.platform === 'darwin') {
		return 'mac';
	}
	else {
		return 'linux';
	}
}

export async function preprocessJSONC(text: string, settings: Settings): Promise<string> {
	const config = vscode.workspace.getConfiguration('syncSettings');
	const host = settings.hostname ?? hostname(config);
	const { profile } = settings;

	const args = {
		...process.env,
		editor: EDITOR,
		editorStorage: await getEditorStorage(),
		globalStorage: path.join(settings.globalStorageUri.fsPath, '..'),
		host,
		hostname: host,
		profile,
		os: OS,
		userStorage: os.homedir(),
		version: vscode.version,
	};

	return transform(text, TYPES, args);
}
