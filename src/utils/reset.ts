import fs from 'fs/promises';
import path from 'path';
import { globby } from 'globby';
import vscode from 'vscode';
import { Settings } from '../settings.js';
import { exists } from './exists.js';
import { getExtensionDataPath } from './get-extension-data-path.js';
import { getUserDataPath } from './get-user-data-path.js';
import { Logger } from './logger.js';
import { uninstallExtension } from './uninstall-extension.js';

export async function reset(): Promise<void> { // {{{
	Logger.info('removing all settings and extensions');

	const settings = Settings.get();

	await resetExtensions(settings);
	await resetFiles(settings);

	await vscode.commands.executeCommand('workbench.action.reloadWindow');
} // }}}

async function resetExtensions(settings: Settings): Promise<void> { // {{{
	const extensionDataPath = await getExtensionDataPath();

	const obsoletePath = path.join(extensionDataPath, '.obsolete');
	const obsolete = await exists(obsoletePath) ? JSON.parse(await fs.readFile(obsoletePath, 'utf8')) as Record<string, boolean> : {};

	const extensions = await globby('*', {
		cwd: extensionDataPath,
		onlyDirectories: true,
	});

	for(const name of extensions) {
		if(obsolete[name]) {
			continue;
		}

		const match = /^(.*?)-\d+\.\d+\.\d+(?:-|$)/.exec(name);
		if(!match) {
			continue;
		}

		const id = match[1];

		if(id !== settings.extensionId) {
			await uninstallExtension(id);
		}
	}
} // }}}

async function resetFiles(settings: Settings): Promise<void> { // {{{
	const userDataPath = getUserDataPath(settings);

	const files = await globby(['**', '!workspaceStorage', '!globalStorage'], {
		cwd: userDataPath,
		followSymbolicLinks: false,
	});

	const results = files.map(async (file) => {
		Logger.info('delete:', file);

		return fs.unlink(path.join(userDataPath, file));
	});

	await Promise.all(results);
} // }}}
