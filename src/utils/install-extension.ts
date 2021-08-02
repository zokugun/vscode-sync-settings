import vscode from 'vscode';
import { Logger } from './logger';

export async function installExtension(id: string): Promise<boolean> { // {{{
	Logger.info('install:', id);

	try {
		await vscode.commands.executeCommand('workbench.extensions.installExtension', id);

		return true;
	}
	catch (error: unknown) {
		Logger.error(error);

		return false;
	}
} // }}}
