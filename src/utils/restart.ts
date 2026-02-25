import { restartApp } from '@zokugun/vscode-utils';
import vscode from 'vscode';
import { EDITOR_MODE, EditorMode } from './editor.js';

export type RestartMode = 'auto' | 'none' | 'reload-windows' | 'restart-app' | 'restart-host';

export async function restartEditor(restart: boolean, reload: boolean, mode: RestartMode, name: string): Promise<void> {
	if(mode === 'auto') {
		if(restart) {
			await doRestart(name);
		}
		else if(reload) {
			await vscode.commands.executeCommand('workbench.action.reloadWindow');
		}
	}
	else if(mode === 'none') {
		// do nothing
	}
	else if(mode === 'reload-windows') {
		if(restart || reload) {
			await vscode.commands.executeCommand('workbench.action.reloadWindow');
		}
	}
	else if(mode === 'restart-app') {
		if(restart || reload) {
			await doRestart(name);
		}
	}
	else if(mode === 'restart-host') {
		// eslint-disable-next-line unicorn/no-lonely-if
		if(restart || reload) {
			await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
		}
	}
}

async function doRestart(name: string): Promise<void> {
	if(EDITOR_MODE === EditorMode.Theia || EDITOR_MODE === EditorMode.Cursor) {
		await vscode.window.showInformationMessage(
			`Source: ${name}\n\nThe editor needs to be restarted before continuing. You need to do it manually. Thx`,
			{
				modal: true,
			},
		);
	}
	else {
		await restartApp();
	}
}
