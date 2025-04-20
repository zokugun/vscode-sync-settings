import vscode from 'vscode';
import { Logger } from './logger.js';

export async function enableExtension(id: string): Promise<boolean> {
	Logger.info('enable:', id);

	try {
		await vscode.commands.executeCommand('workbench.extensions.enableExtension', id);

		return true;
	}
	catch (error: unknown) {
		Logger.error(error);

		return false;
	}
}
