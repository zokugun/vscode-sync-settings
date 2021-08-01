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

export abstract class Repository {
	protected _reloadWindow = true;
	protected _profile = '';
	protected _includes: string[] = [];
	protected _initialized = false;

	public abstract type: RepositoryType;

	public get includes() { // {{{
		return this._includes;
	} // }}}

	public get profile() { // {{{
		return this._profile;
	} // }}}

	public async reset(): Promise<void> { // {{{
		Logger.info('resetting settings');

		const settings = Settings.get();

		await this.resetFiles(settings);
		await this.resetExtensions(settings);

		await vscode.commands.executeCommand('workbench.action.reloadWindow');
	} // }}}

	public setIncludes(includes: string[]): void { // {{{
		this._includes = includes;
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

	protected filterSettings(text: string): string { // {{{
		const config = vscode.workspace.getConfiguration('syncSettings');
		const ignoredSettings = config.get<string[]>('ignoredSettings') ?? [];

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

	protected async installExtension(id: string): Promise<void> { // {{{
		Logger.info('install:', id);

		try {
			await vscode.commands.executeCommand('workbench.extensions.installExtension', id);
		}
		catch (error: unknown) {
			this._reloadWindow = false;

			Logger.error(error);
		}
	} // }}}

	protected async listExtensions(): Promise<ExtensionList> { // {{{
		const config = vscode.workspace.getConfiguration('syncSettings');
		const ignoredExtensions = config.get<string[]>('ignoredExtensions') ?? [];

		const disabled = [];
		const enabled = [];

		const ids: Record<string, boolean> = {};

		for(const extension of vscode.extensions.all) {
			const id = extension.id.toLocaleLowerCase();
			const packageJSON = extension.packageJSON as { isBuiltin: boolean; isUnderDevelopment: boolean; uuid: string };

			if(!packageJSON || packageJSON.isBuiltin || packageJSON.isUnderDevelopment || ignoredExtensions.includes(id)) {
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

			if(!ids[id] && !ignoredExtensions.includes(id)) {
				const pkg = JSON.parse(await fs.readFile(path.join(extDataPath, name, 'package.json'), 'utf-8')) as { __metadata: { id: string } };

				disabled.push({
					id,
					uuid: pkg.__metadata.id,
				});
			}
		}

		return { disabled, enabled };
	} // }}}

	protected async listUserFiles(cwd: string): Promise<string[]> { // {{{
		return globby(this._includes, {
			cwd,
			followSymbolicLinks: false,
		});
	} // }}}

	protected async uninstallExtension(id: string): Promise<void> { // {{{
		Logger.info('uninstall:', id);

		return vscode.commands.executeCommand('workbench.extensions.uninstallExtension', id);
	} // }}}

	private async resetExtensions(settings: Settings): Promise<void> { // {{{
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

			if(id !== settings.extensionId) {
				await this.uninstallExtension(id);
			}
		}
	} // }}}

	private async resetFiles(settings: Settings): Promise<void> { // {{{
		const userDataPath = getUserDataPath(settings);

		const files = await this.listUserFiles(userDataPath);
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
