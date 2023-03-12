import fs from 'fs/promises';
import path from 'path';
import globby from 'globby';
import vscode from 'vscode';
import { Settings } from '../settings';
import { exists } from './exists';
import { getExtensionDataPath } from './get-extension-data-path';
import { getUserDataPath } from './get-user-data-path';
import { Logger } from './logger';
import { uninstallExtension } from './uninstall-extension';

export async function reset(): Promise<void> { // {{{
	Logger.info('removing all settings and extensions');

	const settings = Settings.get();

	await resetExtensions(settings);
	await resetFiles(settings);

	await vscode.commands.executeCommand('workbench.action.reloadWindow');
} // }}}

async function resetExtensions(settings: Settings): Promise<void> { // {{{
	const extDataPath = await getExtensionDataPath();

	const obsoletePath = path.join(extDataPath, '.obsolete');
	const obsolete = await exists(obsoletePath) ? JSON.parse(await fs.readFile(obsoletePath, 'utf-8')) as Record<string, boolean> : {};

	const extensions = await globby('*', {
		cwd: extDataPath,
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
