import vscode from 'vscode';
import { Logger } from './logger.js';

export async function installExtension(id: string, saved: Record<string, vscode.Uri>): Promise<boolean> {
	try {
		if(saved[id]) {
			Logger.info('install:', saved[id]);

			await vscode.commands.executeCommand('workbench.extensions.installExtension', saved[id]);
		}
		else {
			Logger.info('install:', id);

			await vscode.commands.executeCommand('workbench.extensions.installExtension', id);
		}

		return true;
	}
	catch (error: unknown) {
		Logger.error(error);

		return false;
	}
}
