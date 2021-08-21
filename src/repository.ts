import path from 'path';
import fs from 'fs/promises';
import vscode, { WorkspaceConfiguration } from 'vscode';
import globby from 'globby';
import { Settings } from './settings';
import { RepositoryType } from './repository-type';
import { exists } from './utils/exists';
import { getExtensionDataPath } from './utils/get-extension-data-path';

export interface ExtensionList {
	disabled: string[];
	enabled: string[];
	uninstall?: string[];
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

	protected getIgnoredSettings(config: WorkspaceConfiguration): string[] { // {{{
		const ignoredSettings = config.get<string[]>('ignoredSettings') ?? [];

		return ignoredSettings.filter((value) => !value.startsWith('syncSettings'));
	} // }}}

	protected getEditorKeybindingsPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'keybindings.json');
	} // }}}

	protected getEditorSnippetsPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'snippets');
	} // }}}

	protected getEditorUserSettingsPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'settings.json');
	} // }}}

	protected async listEditorExtensions(ignoredExtensions: string[]): Promise<ExtensionList> { // {{{
		ignoredExtensions = ignoredExtensions.map((id) => id.toLocaleLowerCase());

		const disabled = [];
		const enabled = [];

		const ids: Record<string, boolean> = {};

		for(const extension of vscode.extensions.all) {
			const id = extension.id.toLocaleLowerCase();
			const packageJSON = extension.packageJSON as { isBuiltin: boolean; isUnderDevelopment: boolean };

			if(!packageJSON || packageJSON.isBuiltin || packageJSON.isUnderDevelopment || id === this._settings.extensionId || ignoredExtensions.includes(id)) {
				continue;
			}

			enabled.push(id);

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

			const id = match[1].toLocaleLowerCase();

			if(!ids[id] && id !== this._settings.extensionId && !ignoredExtensions.includes(id)) {
				disabled.push(id);
			}
		}

		return { disabled, enabled };
	} // }}}

	protected async listEditorSnippets(userDataPath: string): Promise<string[]> { // {{{
		const editorPath = this.getEditorSnippetsPath(userDataPath);
		if(await exists(editorPath)) {
			return globby('**', {
				cwd: editorPath,
				followSymbolicLinks: false,
			});
		}
		else {
			return [];
		}
	} // }}}

	public abstract download(): Promise<void>;

	public abstract duplicateProfileTo(originalProfile: string, newProfile: string): Promise<void>;

	public abstract extendProfileTo(originalProfile: string, newProfile: string): Promise<void>;

	public abstract initialize(): Promise<void>;

	public abstract listProfiles(): Promise<string[]>;

	public abstract restoreProfile(): Promise<void>;

	public abstract serializeProfile(): Promise<void>;

	public abstract terminate(): Promise<void>;

	public abstract upload(): Promise<void>;

	public abstract getProfileSettingsPath(profile?: string): string;
}
