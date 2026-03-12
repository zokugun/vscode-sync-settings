import { restartApp } from '@zokugun/vscode-utils';
import vscode from 'vscode';
import { EXTENSION_NAME } from './constants.js';
import { Logger } from './logger.js';

export type RestartMode = 'auto' | 'none' | 'reload-windows' | 'restart-app' | 'restart-host';

export async function restartEditor(restart: boolean, reload: boolean, mode: RestartMode, binary: string | undefined): Promise<void> {
	if(mode === 'auto') {
		if(restart) {
			await restartApp(EXTENSION_NAME, Logger);
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
			await restartApp(EXTENSION_NAME, Logger, { binary });
		}
	}
	else if(mode === 'restart-host') {
		// eslint-disable-next-line unicorn/no-lonely-if
		if(restart || reload) {
			await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
		}
	}
}
