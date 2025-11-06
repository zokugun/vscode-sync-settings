import path from 'path';
import process from 'process';
import type vscode from 'vscode';

export enum EditorMode {
	Theia = 'theia',
	VSCode = 'vscode',
}

// eslint-disable-next-line import/no-mutable-exports,@typescript-eslint/naming-convention
export let EDITOR_MODE = EditorMode.VSCode;

export function detectEditor(context: vscode.ExtensionContext): void {
	if(process.env.VSCODE_PORTABLE) {
		return;
	}

	const storage = path.join(context.globalStorageUri.fsPath, '..', '..');

	if(path.basename(storage) !== 'User') {
		EDITOR_MODE = EditorMode.Theia;
	}
}
