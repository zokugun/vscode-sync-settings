import path from 'path';
import fse from 'fs-extra';
import globby from 'globby';
import vscode, { type WorkspaceConfiguration } from 'vscode';
import type { RepositoryType } from './repository-type.js';
import { type Hook, type Settings } from './settings.js';
import { EDITOR_MODE, EditorMode } from './utils/editor.js';
import { exists } from './utils/exists.js';
import { getEditorStorage } from './utils/get-editor-storage.js';
import { getExtensionDataPath } from './utils/get-extension-data-path.js';
import { NIL_UUID } from './utils/nil-uuid.js';
import { listVSIXExtensions } from './utils/vsix-manager.js';

export type ExtensionId = {
	id: string;
	uuid?: string;
	version?: string;
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
	Extensions = 'extensions',
	Keybindings = 'keybindings',
	Mcp = 'mcp',
	ProfileAssociations = 'profile-associations',
	Profiles = 'profiles',
	Settings = 'settings',
	Snippets = 'snippets',
	Tasks = 'tasks',
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
		if(EDITOR_MODE === EditorMode.Theia) {
			return this.listTheiaExtensions(ignoredExtensions, allInstalledExtensions);
		}
		else {
			return this.listVSCodeExtensions(ignoredExtensions, allInstalledExtensions);
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

	protected getEditorDataProfilesDataPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'profiles');
	} // }}}

	protected getEditorKeybindingsPath(userDataPath: string): string { // {{{
		if(EDITOR_MODE === EditorMode.Theia) {
			return path.join(userDataPath, 'keymaps.json');
		}
		else {
			return path.join(userDataPath, 'keybindings.json');
		}
	} // }}}

	protected getEditorMcpPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'mcp.json');
	} // }}}

	protected getEditorSnippetsPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'snippets');
	} // }}}

	protected getEditorStorageJsonPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'globalStorage', 'storage.json');
	} // }}}

	protected getEditorTasksPath(userDataPath: string): string { // {{{
		return path.join(userDataPath, 'tasks.json');
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

	protected async listTheiaExtensions(ignoredExtensions: string[], allInstalledExtensions: boolean): Promise<ExtensionList> { // {{{
		const extensionsFromVSIXManager = allInstalledExtensions ? [] : await listVSIXExtensions();

		const builtin: {
			disabled: string[];
		} = {
			disabled: [],
		};
		const disabled: string[] = [];
		let enabled: string[] = [];

		const ids: Record<string, boolean> = {};

		for(const extension of vscode.extensions.all) {
			const id = extension.id;
			const packageJSON = extension.packageJSON as { isUnderDevelopment: boolean; keywords?: string[]; packagePath: string };

			if(ids[id] || !packageJSON || packageJSON.isUnderDevelopment || id === this._settings.extensionId || ignoredExtensions.includes(id) || extensionsFromVSIXManager.includes(id)) {
				continue;
			}

			if(packageJSON.packagePath.includes('deployedPlugins')) {
				enabled.push(id);
				ids[id] = true;
			}
		}

		const storagePath = await getEditorStorage();
		const extensionDataPath = path.join(storagePath, 'deployedPlugins');

		const extensions = await globby('*/extension/package.json', {
			cwd: extensionDataPath,
		});

		for(const packagePath of extensions) {
			const name = path.dirname(path.dirname(packagePath));

			const match = /^(.*?)-\d+\.\d+\.\d+(?:-|$)/.exec(name);
			if(!match) {
				continue;
			}

			const pkg = await fse.readJSON(path.join(extensionDataPath, packagePath)) as { name: string; publisher: string; version: string };
			const id = `${pkg.publisher}.${pkg.name}`;
			const idv = `${pkg.publisher}.${pkg.name}@${pkg.version}`;

			if(!ids[id] && id !== this._settings.extensionId && !ignoredExtensions.includes(id) && !extensionsFromVSIXManager.includes(id)) {
				disabled.push(idv);

				enabled = enabled.filter((eid) => id !== eid);
			}

			ids[id] = true;
		}

		const backendPath = path.join(storagePath, 'backend-settings.json');

		if(await exists(backendPath)) {
			const data = JSON.parse(await fse.readFile(backendPath, 'utf8')) as Record<string, string>;

			if(data['installedPlugins.disabledPlugins']) {
				const disabledPlugins = JSON.parse(data['installedPlugins.disabledPlugins']) as string[];

				for(const extension of disabledPlugins) {
					const [id] = extension.split('@');

					if(!ids[id]) {
						builtin.disabled.push(extension);

						ids[id] = true;
					}
				}
			}
		}

		if(builtin.disabled.length > 0) {
			return { builtin, disabled: disabled.map((id) => ({ id })), enabled: enabled.map((id) => ({ id })) };
		}
		else {
			return { disabled: disabled.map((id) => ({ id })), enabled: enabled.map((id) => ({ id })) };
		}
	} // }}}

	protected async listVSCodeExtensions(ignoredExtensions: string[], allInstalledExtensions: boolean): Promise<ExtensionList> { // {{{
		const extensionsFromVSIXManager = allInstalledExtensions ? [] : await listVSIXExtensions();

		const builtin: {
			disabled: string[];
		} = {
			disabled: [],
		};
		const disabled: Array<{ id: string; uuid: string; version?: string }> = [];
		const enabled: Array<{ id: string; uuid: string; version?: string }> = [];

		const ids: Record<string, boolean> = {};

		for(const extension of vscode.extensions.all) {
			const id = extension.id;
			const packageJSON = extension.packageJSON as { isBuiltin: boolean; isUnderDevelopment: boolean; uuid: string };

			if(ids[id] || !packageJSON || packageJSON.isUnderDevelopment || id === this._settings.extensionId || ignoredExtensions.includes(id) || extensionsFromVSIXManager.includes(id)) {
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

		const extensionsJsonPath = path.join(extensionDataPath, 'extensions.json');
		const extensionsJson = await exists(extensionsJsonPath) ? await fse.readJSON(extensionsJsonPath) as Array<{ identifier: { id: string; uuid: string }; metadata: { pinned?: boolean; source: string; id: string }; version: string }> : [];
		const metadatas: Record<string, { uuid: string; pinned: boolean; source: string; version: string; metadataId: string }> = {};

		for(const { identifier: { id, uuid }, metadata: { pinned, source, id: mid }, version } of extensionsJson) {
			metadatas[id] = { uuid, source, pinned: pinned ?? false, version, metadataId: mid };
		}

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

			const version = metadatas[id]?.pinned && metadatas[id].source === 'gallery' ? metadatas[id].version : undefined;

			if(ids[id]) {
				if(version) {
					const extension = enabled.find((extension) => extension.id === id);

					if(extension) {
						extension.version = version;
					}
				}
			}
			else if(id !== this._settings.extensionId && !ignoredExtensions.includes(id) && !extensionsFromVSIXManager.includes(id)) {
				let uuid = NIL_UUID;

				if(pkg.__metadata?.id) {
					uuid = pkg.__metadata?.id;
				}
				else if(metadatas[id]) {
					uuid = metadatas[id].uuid ?? metadatas[id].metadataId ?? NIL_UUID;
				}

				const extension: { id: string; uuid: string; version?: string } = {
					id,
					uuid,
				};

				if(version) {
					extension.version = version;
				}

				disabled.push(extension);
			}

			ids[id] = true;
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

			ids[id] = true;
		}

		if(builtin.disabled.length > 0) {
			return { builtin, disabled, enabled };
		}
		else {
			return { disabled, enabled };
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
