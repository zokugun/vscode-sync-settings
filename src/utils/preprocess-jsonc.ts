import process from 'process';
import { transform } from '@daiyam/jsonc-preprocessor';
import vscode from 'vscode';
import { hostname } from './hostname';

const TYPES = {
	version: 'version',
};

const EDITOR = editor();
const OS = os();

function editor(): string {
	return vscode.env.appName.toLocaleLowerCase();
}

function os(): string {
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

export function preprocessJSONC(text: string, settings: { profile: string; hostname?: string }): string {
	const config = vscode.workspace.getConfiguration('syncSettings');
	const host = settings.hostname ?? hostname(config);
	const { profile } = settings;

	const args = {
		...process.env,
		host,
		hostname: host,
		profile,
		os: OS,
		editor: EDITOR,
		version: vscode.version,
	};

	return transform(text, TYPES, args);
}
