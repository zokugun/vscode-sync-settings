import path from 'path';
import fse from 'fs-extra';
import { globby } from 'globby';
import vscode, { type WorkspaceConfiguration } from 'vscode';
import type { RepositoryType } from './repository-type.js';
import { type Hook, type Settings } from './settings.js';
import { exists } from './utils/exists.js';
import { getExtensionDataPath } from './utils/get-extension-data-path.js';
import { NIL_UUID } from './utils/nil-uuid.js';
import { listVSIXExtensions } from './utils/vsix-manager.js';

export type ExtensionId = {
	id: string;
	uuid: string;
};
export type ExtensionList = {
	builtin?: {
		disabled?: string[];
		enabled?: string[];
	};
	disabled: ExtensionId[];
	enabled: ExtensionId[];
	uninstall?: ExtensionId[];
};

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

	public async listEditorExtensions(ignoredExtensions: string[], allInstalledExtensions: boolean = false): Promise<ExtensionList> { // {{{
		const extensionsFromVSIXManager = allInstalledExtensions ? [] : await listVSIXExtensions();

		const builtin: {
			disabled: string[];
		} = {
			disabled: [],
		};
		const disabled: Array<{ id: string; uuid: string }> = [];
		const enabled: Array<{ id: string; uuid: string }> = [];

		const ids: Record<string, boolean> = {};

		for(const extension of vscode.extensions.all) {
			const id = extension.id;
			const packageJSON = extension.packageJSON as { isBuiltin: boolean; isUnderDevelopment: boolean; uuid: string };

			if(!packageJSON || packageJSON.isUnderDevelopment || id === this._settings.extensionId || ignoredExtensions.includes(id) || extensionsFromVSIXManager.includes(id)) {
				continue;
			}

			if(!packageJSON.isBuiltin) {
				enabled.push({
					id,
					uuid: packageJSON.uuid,
				});
			}

			ids[id] = true;
		}

		const extensionDataPath = await getExtensionDataPath();
		const obsoletePath = path.join(extensionDataPath, '.obsolete');
		const obsolete = await exists(obsoletePath) ? await fse.readJSON(obsoletePath) as Record<string, boolean> : {};
		const extensions = await globby('*/package.json', {
			cwd: extensionDataPath,
		});

		for(const packagePath of extensions) {
			const name = path.dirname(packagePath);

			if(obsolete[name]) {
				continue;
			}

			const match = /^(.*?)-\d+\.\d+\.\d+(?:-|$)/.exec(name);
			if(!match) {
				continue;
			}

			const pkg = await fse.readJSON(path.join(extensionDataPath, packagePath)) as { name: string; publisher: string; __metadata: { id: string } };
			const id = `${pkg.publisher}.${pkg.name}`;

			if(obsolete[id]) {
				continue;
			}

			if(!ids[id] && id !== this._settings.extensionId && !ignoredExtensions.includes(id) && !extensionsFromVSIXManager.includes(id)) {
				disabled.push({
					id,
					uuid: pkg.__metadata?.id ?? NIL_UUID,
				});
			}
		}

		const builtinDataPath = path.join(vscode.env.appRoot, 'extensions');
		const builtinExtensions = await globby('*/package.json', {
			cwd: builtinDataPath,
		});

		for(const packagePath of builtinExtensions) {
			const pkg = await fse.readJSON(path.join(builtinDataPath, packagePath)) as { name: string; publisher: string; __metadata: { id: string } };
			const id = `${pkg.publisher}.${pkg.name}`;

			if(!ids[id]) {
				builtin.disabled.push(id);
			}
		}

		if(builtin.disabled.length > 0) {
			return { builtin, disabled, enabled };
		}
		else {
			return { disabled, enabled };
		}
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
			throw new Error('The repository wasn\'t successfully initialized so the current operation can\'t continue. Please check the previous error.');
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

	public abstract download(): Promise<boolean>;

	public abstract deleteProfile(profile: string): Promise<void>;

	public abstract duplicateProfileTo(originalProfile: string, newProfile: string): Promise<void>;

	public abstract extendProfileTo(originalProfile: string, newProfile: string): Promise<void>;

	public abstract getProfileSettingsPath(profile?: string): string;

	public abstract getRepositoryPath(): string;

	public abstract initialize(): Promise<void>;

	public abstract listProfiles(): Promise<string[]>;

	public abstract listProfileExtensions(profile?: string): Promise<ExtensionList>;

	public abstract restoreProfile(): Promise<boolean>;

	public abstract runHook(type: Hook): Promise<void>;

	public abstract serializeProfile(): Promise<void>;

	public abstract terminate(): Promise<void>;

	public abstract upload(): Promise<boolean>;
}
