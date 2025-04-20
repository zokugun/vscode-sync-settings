import vscode from 'vscode';
import { Logger } from './logger.js';

export async function disableExtension(id: string): Promise<boolean> {
	Logger.info('disable:', id);

	try {
		await vscode.commands.executeCommand('workbench.extensions.disableExtension', id);

		return true;
	}
	catch (error: unknown) {
		Logger.error(error);

		return false;
	}
}
