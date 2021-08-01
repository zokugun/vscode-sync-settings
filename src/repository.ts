import path from 'path';
import fs from 'fs/promises';
import vscode from 'vscode';
import globby from 'globby';
import { Settings } from './settings';
import { RepositoryType } from './repository-type';
import { Logger } from './utils/logger';
import { exists } from './utils/exists';
import { filterJSON } from './utils/filter-json';
import { getExtensionDataPath } from './utils/get-extension-data-path';
import { getUserDataPath } from './utils/get-user-data-path';

export interface ExtensionList {
	disabled: Array<{ id: string; uuid: string }>;
	enabled: Array<{ id: string; uuid: string }>;
}

export enum Resource {
	Settings = 'settings',
	Keybindings = 'keybindings',
	Snippets = 'snippets',
	Extensions = 'extensions',
	UIState = 'uiState',
}

export abstract class Repository {
	protected _profile = '';
	protected _initialized = false;
	protected _settings: Settings;

	public abstract type: RepositoryType;

	constructor(settings: Settings) { // {{{
		this._settings = settings;
	} // }}}

	public get profile() { // {{{
		return this._profile;
	} // }}}

	public async reset(): Promise<void> { // {{{
		Logger.info('resetting settings');

		await this.resetExtensions();
		await this.resetFiles();

		await vscode.commands.executeCommand('workbench.action.reloadWindow');
	} // }}}

	public async setProfile(profile: string): Promise<void> { // {{{
		this._profile = profile;

		await this.initialize();
	} // }}}

	protected async canManageExtensions(): Promise<boolean> { // {{{
		const commands = await vscode.commands.getCommands();

		return commands.some((command) => command === 'workbench.extensions.disableExtension' || command === 'workbench.extensions.enableExtension');
	} // }}}

	protected checkInitialized(): void { // {{{
		if(!this._initialized) {
			throw new Error('The repository is not initialized');
		}
	} // }}}

	protected async disableExtension(id: string): Promise<void> { // {{{
		Logger.info('disable:', id);

		return vscode.commands.executeCommand('workbench.extensions.disableExtension', id);
	} // }}}

	protected filterSettings(ignoredSettings: string[], text: string): string { // {{{
		if(ignoredSettings.length === 0) {
			return text;
		}
		else {
			return filterJSON(text, ignoredSettings);
		}
	} // }}}

	protected async enableExtension(id: string): Promise<void> { // {{{
		Logger.info('enable:', id);

		return vscode.commands.executeCommand('workbench.extensions.enableExtension', id);
	} // }}}

	protected async installExtension(id: string): Promise<boolean> { // {{{
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

	protected async listExtensions(ignoredExtensions: string[]): Promise<ExtensionList> { // {{{
		ignoredExtensions = ignoredExtensions.map((id) => id.toLocaleLowerCase());

		const disabled = [];
		const enabled = [];

		const ids: Record<string, boolean> = {};

		for(const extension of vscode.extensions.all) {
			const id = extension.id.toLocaleLowerCase();
			const packageJSON = extension.packageJSON as { isBuiltin: boolean; isUnderDevelopment: boolean; uuid: string };

			if(!packageJSON || packageJSON.isBuiltin || packageJSON.isUnderDevelopment || id === this._settings.extensionId || ignoredExtensions.includes(id)) {
				continue;
			}

			enabled.push({
				id,
				uuid: packageJSON.uuid,
			});

			ids[id] = true;
		}

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

			const match = /^(.*?)-\d+\.\d+\.\d+$/.exec(name);
			if(!match) {
				continue;
			}

			const id = match[1];

			if(!ids[id] && id !== this._settings.extensionId && !ignoredExtensions.includes(id)) {
				const pkg = JSON.parse(await fs.readFile(path.join(extDataPath, name, 'package.json'), 'utf-8')) as { __metadata: { id: string } };

				disabled.push({
					id,
					uuid: pkg.__metadata.id,
				});
			}
		}

		return { disabled, enabled };
	} // }}}

	protected async listKeybindings(userDataPath: string): Promise<string[]> { // {{{
		if(await exists(path.join(userDataPath, 'keybindings.json'))) {
			return ['keybindings.json'];
		}
		else {
			return [];
		}
	} // }}}

	protected async listSettings(userDataPath: string): Promise<string[]> { // {{{
		if(await exists(path.join(userDataPath, 'settings.json'))) {
			return ['settings.json'];
		}
		else {
			return [];
		}
	} // }}}

	protected async listSnippets(userDataPath: string): Promise<string[]> { // {{{
		return globby('snippets/**', {
			cwd: userDataPath,
			followSymbolicLinks: false,
		});
	} // }}}

	protected async uninstallExtension(id: string): Promise<boolean> { // {{{
		Logger.info('uninstall:', id);

		try {
			await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', id);

			return true;
		}
		catch (error: unknown) {
			Logger.error(error);

			return false;
		}
	} // }}}

	private async resetExtensions(): Promise<void> { // {{{
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

			const match = /^(.*?)-\d+\.\d+\.\d+$/.exec(name);
			if(!match) {
				continue;
			}

			const id = match[1];

			if(id !== this._settings.extensionId) {
				await this.uninstallExtension(id);
			}
		}
	} // }}}

	private async resetFiles(): Promise<void> { // {{{
		const userDataPath = getUserDataPath(this._settings);

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

	public abstract download(): Promise<void>;

	public abstract duplicateProfileTo(originalProfile: string, newProfile: string): Promise<void>;

	public abstract initialize(): Promise<void>;

	public abstract listProfiles(): Promise<string[]>;

	public abstract terminate(): Promise<void>;

	public abstract upload(): Promise<void>;
}
