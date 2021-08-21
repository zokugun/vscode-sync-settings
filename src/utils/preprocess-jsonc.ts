import process from 'process';
import { transform } from '@daiyam/jsonc-preprocessor';
import vscode from 'vscode';

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

export function preprocessJSONC(text: string, { profile, hostname }: { profile: string; hostname: string }): string {
	const args = {
		...process.env,
		host: hostname,
		profile,
		os: OS,
		editor: EDITOR,
		version: vscode.version,
	};

	return transform(text, TYPES, args);
}
