import { restartApp } from '@zokugun/vscode-utils';
import vscode from 'vscode';
import { EXTENSION_NAME } from '../utils/constants.js';
import { Logger } from '../utils/logger.js';

export async function restart(): Promise<void> {
	const binary = vscode.workspace.getConfiguration('syncSettings').get<string>('restartBinary');

	await restartApp(EXTENSION_NAME, Logger, { binary });
}
