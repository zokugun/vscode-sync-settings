import vscode from 'vscode';
import { Logger } from './logger.js';

export async function uninstallExtension(id: string): Promise<boolean> {
	Logger.info('uninstall:', id);

	try {
		await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', id);

		return true;
	}
	catch (error: unknown) {
		Logger.error(error);

		return false;
	}
}
