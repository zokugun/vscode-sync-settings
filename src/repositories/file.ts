import { createHash } from 'crypto';
import os from 'os';
import path from 'path';
import process from 'process';
import { comment } from '@daiyam/jsonc-preprocessor';
import { deepEqual } from 'fast-equals';
import fse from 'fs-extra';
import globby from 'globby';
import { SqlValue } from 'sql.js';
import untildify from 'untildify';
import vscode, { WorkspaceConfiguration } from 'vscode';
import yaml from 'yaml';
import { ExtensionId, ExtensionList, Hook, Repository, Resource } from '../repository';
import { RepositoryType } from '../repository-type';
import { Settings } from '../settings';
import { arrayDiff } from '../utils/array-diff';
import { disableExtension } from '../utils/disable-extension';
import { enableExtension } from '../utils/enable-extension';
import { exists } from '../utils/exists';
import { extractProperties } from '../utils/extract-properties';
import { getEditorStorage } from '../utils/get-editor-storage';
import { getExtensionDataUri } from '../utils/get-extension-data-uri';
import { getUserDataPath } from '../utils/get-user-data-path';
import { insertProperties } from '../utils/insert-properties';
import { installExtension } from '../utils/install-extension';
import { isEmpty } from '../utils/is-empty';
import { Logger } from '../utils/logger';
import { NIL_UUID } from '../utils/nil-uuid';
import { preprocessJSONC } from '../utils/preprocess-jsonc';
import { readStateDB } from '../utils/read-statedb';
import { removeProperties } from '../utils/remove-properties';
import { restartApp } from '../utils/restart-app';
import { uninstallExtension } from '../utils/uninstall-extension';
import { getVSIXManager } from '../utils/vsix-manager';
import { writeStateDB } from '../utils/write-statedb';

interface ProfileSettings {
	extends?: string;
}

interface ProfileSyncSettings {
	additionalFiles?: string[];
	keybindingsPerPlatform?: boolean;
	ignoredExtensions?: string[];
	ignoredSettings?: string[];
	resources?: Resource[];
}

interface SnippetsDiff {
	removed: string[];
}

interface UIStateDiff {
	modified: Record<string, unknown>;
	removed: string[];
}

function parseExtensionList(items: Array<string | ExtensionId>): ExtensionId[] { // {{{
	const result: ExtensionId[] = [];

	if(Array.isArray(items) && items.length > 0) {
		for(const item of items) {
			if(typeof item === 'string') {
				result.push({ id: item, uuid: NIL_UUID });
			}
			else if(typeof item === 'object' && typeof item.id === 'string') {
				result.push(item);
			}
		}
	}

	return result;
} // }}}

function parseHook(fromYaml?: string | string[], fromJson?: string | string[]): string[] { // {{{
	const result: string[] = [];

	if(fromYaml) {
		if(Array.isArray(fromYaml)) {
			for(let cmd of fromYaml) {
				cmd = cmd.trim();

				if(cmd.length > 0) {
					result.push(cmd);
				}
			}
		}
		else {
			fromYaml = fromYaml.trim();

			if(fromYaml.length > 0) {
				result.push(fromYaml);
			}
		}
	}

	if(result.length === 0 && fromJson) {
		if(Array.isArray(fromJson)) {
			for(let cmd of fromJson) {
				cmd = cmd.trim();

				if(cmd.length > 0) {
					result.push(cmd);
				}
			}
		}
		else {
			fromYaml = fromJson.trim();

			if(fromJson.length > 0) {
				result.push(fromJson);
			}
		}
	}

	return result;
} // }}}

export class FileRepository extends Repository {
	protected _hooks: Record<Hook, string[]>;
	protected _rootPath: string;

	constructor(settings: Settings, rootPath?: string) { // {{{
		super(settings);

		this._rootPath = untildify(rootPath ?? settings.repository.path!);

		const hooksCfg = vscode.workspace.getConfiguration('syncSettings.hooks');
		const hooksStg = settings.hooks ?? {};

		this._hooks = {
			[Hook.PreDownload]: parseHook(hooksStg[Hook.PreDownload], hooksCfg.get('preDownload')),
			[Hook.PostDownload]: parseHook(hooksStg[Hook.PostDownload], hooksCfg.get('postDownload')),
			[Hook.PreUpload]: parseHook(hooksStg[Hook.PreUpload], hooksCfg.get('preUpload')),
			[Hook.PostUpload]: parseHook(hooksStg[Hook.PostUpload], hooksCfg.get('postUpload')),
		};
	} // }}}

	public override get type() { // {{{
		return RepositoryType.FILE;
	} // }}}

	public override async deleteProfile(profile: string): Promise<void> { // {{{
		this.checkInitialized();

		await fse.remove(path.join(this._rootPath, 'profiles', profile));
	} // }}}

	public override async download(): Promise<boolean> { // {{{
		return this.restoreProfile();
	} // }}}

	public override async duplicateProfileTo(originalProfile: string, newProfile: string): Promise<void> { // {{{
		this.checkInitialized();

		await fse.copy(path.join(this._rootPath, 'profiles', originalProfile), path.join(this._rootPath, 'profiles', newProfile));
	} // }}}

	public override async extendProfileTo(originalProfile: string, newProfile: string): Promise<void> { // {{{
		this.checkInitialized();

		const profilePath = path.join(this._rootPath, 'profiles', newProfile, 'profile.yml');
		const data = yaml.stringify({ extends: originalProfile });

		await fse.outputFile(profilePath, data, 'utf-8');
	} // }}}

	public getProfileAdditionalFilesPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'additionals');
	} // }}}

	public getProfileDataPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data');
	} // }}}

	public getProfileExtensionsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'extensions.yml');
	} // }}}

	public getProfileKeybindingsPath(profile: string, keybindingsPerPlatform: boolean, suffix = ''): string { // {{{
		const profileDataPath = this.getProfileDataPath(profile);

		if(keybindingsPerPlatform) {
			switch(process.platform) {
				case 'darwin':
					return path.join(profileDataPath, `keybindings-macos${suffix}.json`);
				case 'linux':
					return path.join(profileDataPath, `keybindings-linux${suffix}.json`);
				case 'win32':
					return path.join(profileDataPath, `keybindings-windows${suffix}.json`);
				default:
					return path.join(profileDataPath, `keybindings${suffix}.json`);
			}
		}
		else {
			return path.join(profileDataPath, `keybindings${suffix}.json`);
		}
	} // }}}

	public override getProfileSettingsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'profile.yml');
	} // }}}

	public getProfileUserSettingsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'settings.json');
	} // }}}

	public override getRepositoryPath(): string { // {{{
		return this._rootPath;
	} // }}}

	public override async initialize(): Promise<void> { // {{{
		const profilePath = path.join(this._rootPath, 'profiles', this._profile);

		await fse.ensureDir(profilePath);

		this._initialized = true;
	} // }}}

	public override async listProfiles(): Promise<string[]> { // {{{
		this.checkInitialized();

		return globby('*', {
			cwd: path.join(this._rootPath, 'profiles'),
			onlyDirectories: true,
		});
	} // }}}

	public override async listProfileExtensions(profile: string = this.profile): Promise<ExtensionList> { // {{{
		const settings = await this.loadProfileSettings(profile);
		let dataPath = this.getProfileExtensionsPath(profile);

		if(!settings.extends) {
			if(!await exists(dataPath)) {
				dataPath = this.getProfileExtensionsOldPath(profile);
				if(!await exists(dataPath)) {
					return { disabled: [], enabled: [] };
				}
			}

			const data = await fse.readFile(dataPath, 'utf-8');
			const raw = yaml.parse(data) as {
				builtin?: {
					disabled?: string[];
				};
				disabled: Array<string | ExtensionId>;
				enabled: Array<string | ExtensionId>;
			};

			if(!raw || typeof raw !== 'object') {
				return {
					disabled: [],
					enabled: [],
				};
			}

			return {
				builtin: raw.builtin?.disabled && Array.isArray(raw.builtin.disabled) ? { disabled: raw.builtin.disabled.filter((value) => typeof value === 'string') } : undefined,
				disabled: parseExtensionList(raw.disabled),
				enabled: parseExtensionList(raw.enabled),
			};
		}

		if(!await exists(dataPath)) {
			dataPath = this.getProfileExtensionsOldPath(profile);
			if(!await exists(dataPath)) {
				return this.listProfileExtensions(settings.extends);
			}
		}

		const data = await fse.readFile(dataPath, 'utf-8');
		const raw = yaml.parse(data) as {
			builtin?: {
				disabled?: string[];
				enabled?: string[];
			};
			disabled: Array<string | ExtensionId>;
			enabled: Array<string | ExtensionId>;
			uninstall?: Array<string | ExtensionId>;
		};

		const extensions = !raw || typeof raw !== 'object' ? {
			disabled: [],
			enabled: [],
			uninstall: undefined,
		} : {
			builtin: {
				disabled: raw.builtin?.disabled && Array.isArray(raw.builtin.disabled) ? raw.builtin.disabled.filter((value) => typeof value === 'string') : [],
				enabled: raw.builtin?.enabled && Array.isArray(raw.builtin.enabled) ? raw.builtin.enabled.filter((value) => typeof value === 'string') : [],
			},
			disabled: parseExtensionList(raw.disabled),
			enabled: parseExtensionList(raw.enabled),
			uninstall: !raw.uninstall ? undefined : parseExtensionList(raw.uninstall),
		};

		const ancestors = await this.listProfileExtensions(settings.extends);

		return this.applyExtensionsDiff(ancestors, extensions);
	} // }}}

	public async loadProfileSettings(profile: string = this.profile): Promise<ProfileSettings> { // {{{
		const path = this.getProfileSettingsPath(profile);

		if(await exists(path)) {
			const data = await fse.readFile(path, 'utf-8');
			const settings = yaml.parse(data) as ProfileSettings;

			return settings ?? {};
		}
		else {
			return {};
		}
	} // }}}

	public override async restoreProfile(): Promise<boolean> { // {{{
		this.checkInitialized();

		Logger.info(`restore profile "${this.profile}" from ${this._rootPath}`);

		const syncSettings = await this.loadProfileSyncSettings();
		const userDataPath = getUserDataPath(this._settings);
		const ancestorProfile = await this.getAncestorProfile(this.profile);
		const resources = syncSettings.resources ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets, Resource.UIState];

		if(this._settings.remote) {
			if(resources.includes(Resource.Extensions)) {
				void await this.restoreExtensions(syncSettings);
			}

			Logger.info('restore done');
		}
		else {
			const restart = await this.shouldRestartApp(resources, userDataPath);

			if(restart) {
				const result = await vscode.window.showInformationMessage(
					'The editor will be restarted after applying the profile. Do you want to continue?',
					{
						modal: true,
					},
					'Yes',
				);

				if(!result) {
					return false;
				}
			}

			let reloadWindow = false;

			if(resources.includes(Resource.Settings)) {
				await this.restoreUserSettings(ancestorProfile, userDataPath);
			}

			if(resources.includes(Resource.Keybindings)) {
				await this.restoreKeybindings(ancestorProfile, userDataPath);
			}

			if(resources.includes(Resource.Snippets)) {
				await this.restoreSnippets(userDataPath);
			}

			if(resources.includes(Resource.Extensions)) {
				reloadWindow = await this.restoreExtensions(syncSettings);

				const vsixManager = getVSIXManager();
				if(vsixManager) {
					await vsixManager.installExtensions(true);
				}
			}

			if(resources.includes(Resource.UIState)) {
				await this.restoreUIState(userDataPath);
			}

			await this.restoreAdditionalFiles(ancestorProfile);

			Logger.info('restore done');

			if(restart) {
				await restartApp();
			}
			else if(reloadWindow) {
				await vscode.commands.executeCommand('workbench.action.reloadWindow');
			}
		}

		return true;
	} // }}}

	public override async runHook(hook: Hook): Promise<void> { // {{{
		const commands = this._hooks[hook];

		if(commands.length > 0) {
			const terminal = await Settings.getTerminal(this._rootPath);

			for(const command of commands) {
				terminal.sendText(command, true);
			}
		}
	} // }}}

	public override async serializeProfile(): Promise<void> { // {{{
		this.checkInitialized();

		const syncSettings = vscode.workspace.getConfiguration('syncSettings');
		const resources = syncSettings.get<string[]>('resources') ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets, Resource.UIState];

		Logger.info('serialize to:', this._rootPath);

		const profileSettings = await this.loadProfileSettings();
		const userDataPath = getUserDataPath(this._settings);

		const profileDataPath = this.getProfileDataPath();
		await fse.ensureDir(profileDataPath);

		let extensions: ExtensionList | undefined;
		if(resources.includes(Resource.Extensions)) {
			extensions = await this.serializeExtensions(profileSettings, syncSettings);
		}
		else {
			await this.scrubExtensions();
		}

		if(!this._settings.remote) {
			if(resources.includes(Resource.Snippets)) {
				await this.serializeSnippets(profileSettings, userDataPath);
			}
			else {
				await this.scrubSnippets();
			}

			if(resources.includes(Resource.UIState)) {
				await this.serializeUIState(profileSettings, userDataPath, extensions);
			}
			else {
				await this.scrubUIState();
			}

			if(!profileSettings.extends) {
				if(resources.includes(Resource.Keybindings)) {
					await this.serializeKeybindings(syncSettings, userDataPath);
				}
				else {
					await this.scrubKeybindings();
				}

				if(resources.includes(Resource.Settings)) {
					await this.serializeUserSettings(syncSettings, userDataPath);
				}
				else {
					await this.scrubUserSettings();
				}

				await this.serializeAdditionalFiles(syncSettings);
			}

			await this.saveProfileSyncSettings(syncSettings);
		}

		Logger.info('serialize done');
	} // }}}

	public override async terminate(): Promise<void> { // {{{
		this.checkInitialized();
	} // }}}

	public override async upload(): Promise<boolean> { // {{{
		await this.serializeProfile();

		return true;
	} // }}}

	protected applyExtensionsDiff({ disabled, enabled, builtin }: ExtensionList, diff: ExtensionList): ExtensionList { // {{{
		for(const ext of diff.disabled) {
			const index = enabled.findIndex((item) => item.id === ext.id);
			if(index !== -1) {
				enabled.splice(index, 1);
			}

			if(!disabled.some((item) => item.id === ext.id)) {
				disabled.push(ext);
			}
		}

		for(const ext of diff.enabled) {
			const index = disabled.findIndex((item) => item.id === ext.id);
			if(index !== -1) {
				disabled.splice(index, 1);
			}

			if(!enabled.some((item) => item.id === ext.id)) {
				enabled.push(ext);
			}
		}

		if(diff.uninstall) {
			for(const { id } of diff.uninstall) {
				const index = disabled.findIndex((item) => item.id === id);
				if(index !== -1) {
					disabled.splice(index, 1);
				}
				else {
					const index = enabled.findIndex((item) => item.id === id);
					if(index !== -1) {
						enabled.splice(index, 1);
					}
				}
			}
		}

		if(builtin) {
			builtin.disabled = builtin.disabled ?? [];
			builtin.enabled = builtin.enabled ?? [];

			for(const id of diff.builtin!.disabled!) {
				const index = builtin.enabled.indexOf(id);
				if(index !== -1) {
					builtin.enabled.splice(index, 1);
				}

				if(!builtin.disabled.includes(id)) {
					builtin.disabled.push(id);
				}
			}

			for(const id of diff.builtin!.enabled!) {
				const index = builtin.disabled.indexOf(id);
				if(index !== -1) {
					builtin.disabled.splice(index, 1);
				}

				if(!builtin.enabled.includes(id)) {
					builtin.enabled.push(id);
				}
			}
		}
		else {
			builtin = diff.builtin;
		}

		return {
			builtin,
			disabled,
			enabled,
		};
	} // }}}

	protected async expandPath(file: string): Promise<string> { // {{{
		if(file.startsWith('~/')) {
			return path.join(os.homedir(), file.slice(2));
		}
		else if(file.startsWith('~editorStorage/')) {
			return path.join(await getEditorStorage(), file.slice(15));
		}
		else if(file.startsWith('~globalStorage/')) {
			return path.join(this._settings.globalStorageUri.fsPath, '..', file.slice(15));
		}
		else {
			return file;
		}
	} // }}}

	protected async getAncestorProfile(profile: string): Promise<string> { // {{{
		let settings = await this.loadProfileSettings(profile);

		while(settings.extends) {
			profile = settings.extends;

			settings = await this.loadProfileSettings(profile);
		}

		return profile;
	} // }}}

	protected getDiffSnippetsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'snippets.diff.yml');
	} // }}}

	protected getDiffUIStatePath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'ui-state.diff.yml');
	} // }}}

	protected getProfileExtensionsOldPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'extensions.yml');
	} // }}}

	protected async getProfileKeybindings(profile: string, keybindingsPerPlatform: boolean): Promise<string | undefined> { // {{{
		const syncSettings = await this.loadProfileSyncSettings(profile);
		const profilePerPlatform = syncSettings.keybindingsPerPlatform ?? true;
		if(profilePerPlatform !== keybindingsPerPlatform) {
			return undefined;
		}

		const dataPath = this.getProfileKeybindingsPath(profile, keybindingsPerPlatform);

		if(await exists(dataPath)) {
			return fse.readFile(dataPath, 'utf-8');
		}
		else {
			return undefined;
		}
	} // }}}

	protected getProfileSnippetsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'snippets');
	} // }}}

	protected getProfileSyncSettingsOldPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'config.yml');
	} // }}}

	protected getProfileSyncSettingsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, '.sync.yml');
	} // }}}

	protected getProfileUIStatePath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'ui-state.yml');
	} // }}}

	protected async getProfileUserSettings(profile: string = this.profile): Promise<string | undefined> { // {{{
		const dataPath = this.getProfileUserSettingsPath(profile);

		if(await exists(dataPath)) {
			return fse.readFile(dataPath, 'utf-8');
		}
		else {
			return undefined;
		}
	} // }}}

	protected async listEditorUIStateProperties(userDataPath: string, extensions?: ExtensionList): Promise<Record<string, SqlValue>> { // {{{
		if(!extensions) {
			extensions = await this.listEditorExtensions([], true) ?? { disabled: [], enabled: [] };
		}

		const keys = [
			...extensions.disabled.map(({ id }) => id),
			...extensions.enabled.map(({ id }) => id),
		];

		const data = await readStateDB(userDataPath, `SELECT key, value FROM ItemTable WHERE key IN ('${keys.join('\', \'')}') OR key LIKE 'workbench.%' ORDER BY key COLLATE NOCASE ASC`);
		if(!data) {
			return {};
		}

		const properties: Record<string, SqlValue> = {};
		const extDataPath = await getExtensionDataUri();
		const homeDirectory = os.homedir();

		for(let [key, value] of data.values) {
			if(typeof value === 'string') {
				value = value.replaceAll(extDataPath, '%%EXTENSION_DATA_PATH%%');

				if(value.includes(homeDirectory)) {
					continue;
				}
			}

			properties[key as string] = value;
		}

		return properties;
	} // }}}

	protected async listProfileSnippetHashes(profile: string = this.profile): Promise<Record<string, string>> { // {{{
		const settings = await this.loadProfileSettings(profile);
		const dataPath = this.getProfileSnippetsPath(profile);

		let snippets: Record<string, string>;
		let newFiles: string[];

		if(settings.extends) {
			snippets = await this.listProfileSnippetHashes(settings.extends);

			const diffPath = this.getDiffSnippetsPath(profile);
			if(await exists(diffPath)) {
				const data = await fse.readFile(diffPath, 'utf-8');
				const diff = yaml.parse(data) as { remove: string[] };

				for(const name of diff.remove) {
					if(snippets[name]) {
						delete snippets[name];
					}
				}
			}

			newFiles = await globby('**', {
				cwd: dataPath,
				followSymbolicLinks: false,
			});
		}
		else {
			snippets = {};
			newFiles = await globby('**', {
				cwd: dataPath,
				followSymbolicLinks: false,
			});
		}

		const hasher = createHash('SHA1');

		for(const file of newFiles) {
			const data = await fse.readFile(path.join(dataPath, file), 'utf-8');
			const hash = hasher.copy().update(data).digest('hex');

			snippets[file] = hash;
		}

		return snippets;
	} // }}}

	protected async listProfileSnippetPaths(profile: string = this.profile): Promise<Record<string, string>> { // {{{
		const settings = await this.loadProfileSettings(profile);
		const dataPath = this.getProfileSnippetsPath(profile);

		let snippets: Record<string, string>;
		let newFiles: string[];

		if(settings.extends) {
			snippets = await this.listProfileSnippetPaths(settings.extends);

			const diffPath = this.getDiffSnippetsPath(profile);
			if(await exists(diffPath)) {
				const data = await fse.readFile(diffPath, 'utf-8');
				const diff = yaml.parse(data) as { removed: string[] };

				for(const name of diff.removed) {
					if(snippets[name]) {
						delete snippets[name];
					}
				}
			}

			newFiles = await globby('**', {
				cwd: dataPath,
				followSymbolicLinks: false,
			});
		}
		else {
			snippets = {};
			newFiles = await globby('**', {
				cwd: dataPath,
				followSymbolicLinks: false,
			});
		}

		for(const file of newFiles) {
			snippets[file] = path.join(dataPath, file);
		}

		return snippets;
	} // }}}

	protected async listProfileUIStateProperties(profile: string = this.profile): Promise<Record<string, unknown>> { // {{{
		const settings = await this.loadProfileSettings(profile);
		const dataPath = this.getProfileUIStatePath(profile);

		if(!settings.extends) {
			if(!await exists(dataPath)) {
				return {};
			}

			const data = await fse.readFile(dataPath, 'utf-8');

			return yaml.parse(data) as Record<string, unknown>;
		}

		const properties = await this.listProfileUIStateProperties(settings.extends);
		const diff = await this.loadUIStateDiff(profile);

		if(!diff) {
			return properties;
		}

		for(const [key, value] of Object.entries(diff.modified)) {
			properties[key] = value;
		}

		for(const key of diff.removed) {
			delete properties[key];
		}

		return properties;
	} // }}}

	protected async listSavedExtensions(profile: string = this.profile, extensions: Record<string, vscode.Uri> = {}): Promise<Record<string, vscode.Uri>> { // {{{
		const dataPath = path.join(this._rootPath, 'profiles', profile, 'data', 'extensions');

		if(fse.existsSync(dataPath)) {
			const files = await globby('*.vsix', {
				cwd: dataPath,
				followSymbolicLinks: false,
			});

			for(const file of files) {
				const match = /^(.*?)-(?:\d+\.){3}vsix$/.exec(file);

				if(match) {
					extensions[match[1]] = vscode.Uri.file(path.join(dataPath, file));
				}
			}
		}

		const settings = await this.loadProfileSettings(profile);

		if(settings.extends) {
			return this.listSavedExtensions(settings.extends, extensions);
		}

		return extensions;
	} // }}}

	protected async loadProfileSyncSettings(profile: string = this.profile): Promise<ProfileSyncSettings> { // {{{
		let path = this.getProfileSyncSettingsPath(profile);

		if(!await exists(path)) {
			path = this.getProfileSyncSettingsOldPath(profile);

			if(!await exists(path)) {
				const settings = await this.loadProfileSettings(profile);

				if(settings.extends) {
					return this.loadProfileSyncSettings(settings.extends);
				}
				else {
					return {};
				}
			}
		}

		const data = await fse.readFile(path, 'utf-8');

		return yaml.parse(data) as ProfileSyncSettings;
	} // }}}

	protected async loadSnippetsDiff(): Promise<SnippetsDiff | undefined> { // {{{
		const diffPath = this.getDiffSnippetsPath();
		if(await exists(diffPath)) {
			const data = await fse.readFile(diffPath, 'utf-8');

			return yaml.parse(data) as SnippetsDiff;
		}
		else {
			return undefined;
		}
	} // }}}

	protected async loadUIStateDiff(profile: string = this.profile): Promise<UIStateDiff | undefined> { // {{{
		const diffPath = this.getDiffUIStatePath(profile);
		if(await exists(diffPath)) {
			const data = await fse.readFile(diffPath, 'utf-8');

			return yaml.parse(data) as UIStateDiff;
		}
		else {
			return undefined;
		}
	} // }}}

	protected async restoreAdditionalFiles(ancestorProfile: string): Promise<void> { // {{{
		const syncSettings = await this.loadProfileSyncSettings(ancestorProfile);

		const additionalFiles = syncSettings.additionalFiles ?? [];
		if(additionalFiles.length === 0) {
			return;
		}

		Logger.info('restore additional files');

		const dataPath = this.getProfileAdditionalFilesPath(ancestorProfile);

		for(let file of additionalFiles) {
			file = file.replace(/\\/g, '/');

			const src = await this.expandPath(file);
			const dst = path.join(dataPath, file.replace(/\//g, '-'));

			await fse.copy(dst, src, {
				preserveTimestamps: true,
			});
		}
	} // }}}

	protected async restoreExtensions(syncSettings: ProfileSyncSettings): Promise<boolean> { // {{{
		Logger.info('restore extensions');

		let failures = false;

		const editor = await this.listEditorExtensions(syncSettings.ignoredExtensions ?? []);
		const saved = await this.listSavedExtensions();
		const local = !this._settings.remote;

		const installed: Record<string, boolean> = {};

		const currentlyDisabled: Record<string, boolean> = {};
		for(const { id } of editor.disabled) {
			currentlyDisabled[id] = true;
			installed[id] = true;
		}

		const currentlyEnabled: Record<string, boolean> = {};
		for(const { id } of editor.enabled) {
			currentlyEnabled[id] = true;
			installed[id] = true;
		}

		const { builtin, disabled, enabled, uninstall } = await this.listProfileExtensions();

		if(await this.canManageExtensions()) {
			if(local) {
				for(const { id } of disabled) {
					if(!installed[id]) {
						failures = !(await installExtension(id, saved) && await disableExtension(id)) || failures;
					}
					else if(currentlyEnabled[id]) {
						failures = !(await disableExtension(id)) || failures;
					}

					installed[id] = false;
				}
			}

			for(const { id } of enabled) {
				if(!installed[id]) {
					failures = !(await installExtension(id, saved)) || failures;
				}
				else if(local && currentlyDisabled[id]) {
					failures = !(await enableExtension(id)) || failures;
				}

				installed[id] = false;
			}

			for(const id in installed) {
				if(installed[id]) {
					failures = !(await uninstallExtension(id)) || failures;
				}
			}

			const currentlyDisabledBuiltin = [];

			if(editor.builtin?.disabled) {
				for(const id of editor.builtin.disabled) {
					currentlyDisabledBuiltin[id] = true;
				}
			}

			if(builtin?.disabled) {
				for(const id of builtin.disabled) {
					if(local && !currentlyDisabledBuiltin[id]) {
						failures = !(await disableExtension(id)) || failures;
					}

					currentlyDisabledBuiltin[id] = false;
				}
			}

			for(const [id, enable] of Object.entries(currentlyDisabledBuiltin)) {
				if(enable) {
					failures = !(await enableExtension(id)) || failures;
				}
			}
		}
		else {
			if(local) {
				for(const { id } of disabled) {
					if(!installed[id]) {
						failures = !(await installExtension(id, saved)) || failures;
					}
					else if(currentlyDisabled[id]) {
						installed[id] = false;
					}

					installed[id] = false;
				}
			}

			for(const { id } of enabled) {
				if(!installed[id]) {
					failures = !(await installExtension(id, saved)) || failures;
				}
				else if(local && currentlyDisabled[id]) {
					failures = !(await uninstallExtension(id) && await installExtension(id, saved)) || failures;
				}

				installed[id] = false;
			}

			for(const id in installed) {
				if(installed[id]) {
					failures = !(await uninstallExtension(id)) || failures;
				}
			}

			if(local) {
				const toDisable: any[] = [...disabled];

				if(builtin?.disabled) {
					toDisable.push(...builtin.disabled.map((id) => ({ id })));
				}

				if(toDisable.length > 0) {
					await writeStateDB(getUserDataPath(this._settings), 'INSERT OR REPLACE INTO ItemTable (key, value) VALUES (\'extensionsIdentifiers/disabled\', $value)', {
						$value: JSON.stringify(toDisable),
					});
				}
			}
		}

		if(uninstall) {
			for(const { id } of uninstall) {
				if(installed[id]) {
					failures = !(await uninstallExtension(id)) || failures;
				}
			}
		}

		return failures;
	} // }}}

	protected async restoreKeybindings(ancestorProfile: string, userDataPath: string): Promise<void> { // {{{
		Logger.info('restore keybindings');

		const syncSettings = await this.loadProfileSyncSettings(ancestorProfile);
		const dataPath = this.getEditorKeybindingsPath(userDataPath);
		const keybindingsPerPlatform = syncSettings.keybindingsPerPlatform ?? true;

		let data = await this.getProfileKeybindings(ancestorProfile, keybindingsPerPlatform);

		if(data) {
			data = await preprocessJSONC(data, this._settings);
		}
		else {
			data = '[]';
		}

		await fse.outputFile(dataPath, data, 'utf-8');
	} // }}}

	protected async restoreUserSettings(ancestorProfile: string, userDataPath: string): Promise<void> { // {{{
		Logger.info('restore settings');

		let extracted = '';

		const dataPath = this.getEditorUserSettingsPath(userDataPath);
		if(await exists(dataPath)) {
			const syncSettings = await this.loadProfileSyncSettings(ancestorProfile);
			const ignoredSettings = syncSettings.ignoredSettings ?? [];
			const text = await fse.readFile(dataPath, 'utf-8');

			extracted = extractProperties(text, ignoredSettings);
		}

		let data = await this.getProfileUserSettings(ancestorProfile);

		if(data) {
			data = await preprocessJSONC(data, this._settings);
		}
		else {
			data = '{}';
		}

		if(extracted.length > 0) {
			data = insertProperties(data, extracted);
		}

		await fse.outputFile(dataPath, data, 'utf-8');
	} // }}}

	protected async restoreSnippets(userDataPath: string): Promise<void> { // {{{
		Logger.info('restore snippets');

		const snippetsPath = this.getEditorSnippetsPath(userDataPath);

		await fse.emptyDir(snippetsPath);

		const ignore: string[] = [];
		const diff = await this.loadSnippetsDiff();
		if(diff) {
			ignore.push(...diff.removed);
		}

		const snippets = await this.listProfileSnippetPaths();
		for(const [name, snippetPath] of Object.entries(snippets)) {
			if(ignore.includes(name)) {
				continue;
			}

			await fse.copy(snippetPath, path.join(snippetsPath, name), {
				preserveTimestamps: true,
			});
		}
	} // }}}

	protected async restoreUIState(userDataPath: string): Promise<void> { // {{{
		Logger.info('restore UI state');

		const extDataPath = await getExtensionDataUri();
		const profile = await this.listProfileUIStateProperties();
		const values: any[] = [];

		const args: Record<string, unknown> = {};
		let index = 0;
		for(let [key, value] of Object.entries(profile)) {
			values.push(`'${key}', $${index}`);

			if(typeof value === 'string') {
				value = value.replaceAll('%%EXTENSION_DATA_PATH%%', extDataPath);
			}

			args[`$${index}`] = value;

			++index;
		}

		if(index > 0) {
			await writeStateDB(userDataPath, `INSERT OR REPLACE INTO ItemTable (key, value) VALUES (${values.join('), (')})`, args);
		}
	} // }}}

	protected async saveProfileSyncSettings(config: WorkspaceConfiguration): Promise<void> { // {{{
		const settings: Record<string, any> = {};

		let ancestors: ProfileSyncSettings | undefined;
		let length = 0;

		const profile = await this.loadProfileSettings();
		if(profile.extends) {
			ancestors = await this.loadProfileSyncSettings(profile.extends);
		}

		for(const property of ['keybindingsPerPlatform', 'ignoredExtensions', 'ignoredSettings', 'resources', 'additionalFiles']) {
			const data = config.inspect(property);

			if(data && typeof data.globalValue !== 'undefined') {
				settings[property] = data.globalValue;

				if(!ancestors || !deepEqual(ancestors[property], data.globalValue)) {
					++length;
				}
			}
		}

		await fse.remove(this.getProfileSyncSettingsOldPath());

		if(length > 0) {
			const data = yaml.stringify(settings);

			await fse.writeFile(this.getProfileSyncSettingsPath(), data, 'utf-8');
		}
		else {
			await fse.remove(this.getProfileSyncSettingsPath());
		}
	} // }}}

	protected async saveSnippetsDiff(diff: SnippetsDiff): Promise<void> { // {{{
		const data = yaml.stringify(diff);
		const dataPath = this.getDiffSnippetsPath();

		await fse.writeFile(dataPath, data, {
			encoding: 'utf-8',
			mode: 0o600,
		});
	} // }}}

	protected async saveUIStateDiff(diff: UIStateDiff): Promise<void> { // {{{
		if(diff.removed.length > 0 || !isEmpty(diff.modified)) {
			const data = yaml.stringify(diff);

			await fse.writeFile(this.getDiffUIStatePath(), data, {
				encoding: 'utf-8',
				mode: 0o600,
			});
		}
	} // }}}

	protected async scrubExtensions(): Promise<void> { // {{{
		await fse.remove(this.getProfileExtensionsPath());
	} // }}}

	protected async scrubKeybindings(): Promise<void> { // {{{
		const dataPath = this.getProfileDataPath();

		const files = await globby('keybindings*.json', {
			cwd: dataPath,
			followSymbolicLinks: false,
		});

		for(const file of files) {
			await fse.remove(path.join(dataPath, file));
		}
	} // }}}

	protected async scrubSnippets(): Promise<void> { // {{{
		await fse.remove(this.getProfileSnippetsPath());
	} // }}}

	protected async scrubUIState(): Promise<void> { // {{{
		await fse.remove(this.getProfileUIStatePath());
		await fse.remove(this.getDiffUIStatePath());
	} // }}}

	protected async scrubUserSettings(): Promise<void> { // {{{
		await fse.remove(this.getProfileUserSettingsPath());
	} // }}}

	protected async serializeAdditionalFiles(config: WorkspaceConfiguration): Promise<void> { // {{{
		const dataPath = this.getProfileAdditionalFilesPath();

		const additionalFiles = config.get<string[]>('additionalFiles') ?? [];
		if(additionalFiles.length === 0) {
			return fse.remove(dataPath);
		}

		Logger.info('serialize additional files');

		await fse.emptyDir(dataPath);

		for(let file of additionalFiles) {
			file = file.replace(/\\/g, '/');

			if(file.endsWith('/zokugun.sync-settings/settings.yml')) {
				throw new Error('The file `zokugun.sync-settings/settings.yml` mustn\'t be synchronized.');
			}

			const src = await this.expandPath(file);
			const dst = path.join(dataPath, file.replace(/\//g, '-'));

			await fse.copy(src, dst, {
				preserveTimestamps: true,
			});
		}
	} // }}}

	protected async serializeExtensions(profileSettings: ProfileSettings, config: WorkspaceConfiguration): Promise<ExtensionList> { // {{{
		Logger.info('serialize extensions');

		const ignoredExtensions = config.get<string[]>('ignoredExtensions') ?? [];
		const editor = await this.listEditorExtensions(ignoredExtensions);

		let data: string;
		if(profileSettings.extends) {
			const profile = await this.listProfileExtensions(profileSettings.extends);

			const ids: Record<string, ExtensionId> = {};
			for(const ext of [...profile.disabled, ...profile.enabled, ...editor.disabled, ...editor.enabled]) {
				ids[ext.id] = ext;
			}

			const disabled = arrayDiff(editor.disabled.map(({ id }) => id), profile.disabled.map(({ id }) => id)).map((id) => ids[id]);
			const enabled = arrayDiff(editor.enabled.map(({ id }) => id), profile.enabled.map(({ id }) => id)).map((id) => ids[id]);
			const uninstall = arrayDiff([...profile.disabled, ...profile.enabled].map(({ id }) => id), [...editor.disabled, ...editor.enabled].map(({ id }) => id)).map((id) => ids[id]);
			const builtinDisabled = editor.builtin?.disabled ? (profile.builtin?.disabled ? arrayDiff(editor.builtin.disabled, profile.builtin.disabled) : editor.builtin.disabled) : [];
			const builtinEnabled = profile.builtin?.disabled && editor.builtin?.disabled ? arrayDiff(profile.builtin.disabled, editor.builtin.disabled) : [];

			const output: Record<string, any> = {
				disabled,
				enabled,
			};

			if(uninstall.length > 0) {
				output.uninstall = uninstall;
			}

			if(builtinDisabled.length > 0 || builtinEnabled.length > 0) {
				const builtin: Record<string, any> = {};

				if(builtinDisabled.length > 0) {
					builtin.disabled = builtinDisabled;
				}

				if(builtinEnabled.length > 0) {
					builtin.enabled = builtinEnabled;
				}

				output.builtin = builtin;
			}

			data = yaml.stringify(output);
		}
		else {
			data = yaml.stringify(editor);
		}

		await fse.writeFile(this.getProfileExtensionsPath(), data, {
			encoding: 'utf-8',
			mode: 0o600,
		});

		await fse.remove(this.getProfileExtensionsOldPath());

		return editor;
	} // }}}

	protected async serializeKeybindings(config: WorkspaceConfiguration, userDataPath: string): Promise<void> { // {{{
		Logger.info('serialize keybindings');

		const keybindingsPerPlatform = config.get<boolean>('keybindingsPerPlatform') ?? true;

		let editor: string | undefined;

		const editorPath = this.getEditorKeybindingsPath(userDataPath);
		if(await exists(editorPath)) {
			editor = await fse.readFile(editorPath, 'utf-8');
			editor = comment(editor);
		}

		const dataPath = this.getProfileKeybindingsPath(this.profile, keybindingsPerPlatform);

		if(editor) {
			await fse.writeFile(dataPath, editor, {
				encoding: 'utf-8',
				mode: 0o600,
			});
		}
		else {
			await fse.remove(dataPath);
		}
	} // }}}

	protected async serializeSnippets(profileSettings: ProfileSettings, userDataPath: string): Promise<void> { // {{{
		Logger.info('serialize snippets');

		const snippetsPath = this.getEditorSnippetsPath(userDataPath);
		const editor: string[] = await this.listEditorSnippets(userDataPath);

		if(profileSettings.extends) {
			const profile = await this.listProfileSnippetHashes(profileSettings.extends);
			const hasher = createHash('SHA1');
			const removed: any[] = [];

			if(editor.length > 0) {
				for(const file of Array.from(editor)) {
					const data = await fse.readFile(path.join(snippetsPath, file), 'utf-8');
					const hash = hasher.copy().update(data).digest('hex');

					if(profile[file]) {
						if(hash === profile[file]) {
							const index = editor.indexOf(file);
							if(index !== -1) {
								editor.splice(index, 1);
							}
						}
					}
					else {
						removed.push(file);
					}
				}
			}
			else {
				removed.push(...Object.keys(profile));
			}

			if(removed.length > 0) {
				await this.saveSnippetsDiff({ removed });
			}
		}

		const dataPath = this.getProfileSnippetsPath();

		if(editor.length > 0) {
			await fse.emptyDir(dataPath);

			for(const file of Array.from(editor)) {
				const src = path.join(snippetsPath, file);
				const dst = path.join(dataPath, file);

				await fse.copy(src, dst, {
					preserveTimestamps: true,
				});
			}
		}
		else {
			await fse.remove(dataPath);
		}
	} // }}}

	protected async serializeUIState(profileSettings: ProfileSettings, userDataPath: string, extensions?: ExtensionList): Promise<void> { // {{{
		Logger.info('serialize UI state');

		const editor = await this.listEditorUIStateProperties(userDataPath, extensions);

		if(profileSettings.extends) {
			const profile = await this.listProfileUIStateProperties(profileSettings.extends);

			const removed = arrayDiff(Object.keys(profile), Object.keys(editor));
			const modified: Record<string, unknown> = {};

			for(const [key, value] of Object.entries(editor)) {
				if(value !== profile[key]) {
					modified[key] = value;
				}
			}

			await this.saveUIStateDiff({ modified, removed });
		}
		else {
			const data = yaml.stringify(editor);

			await fse.writeFile(this.getProfileUIStatePath(), data, {
				encoding: 'utf-8',
				mode: 0o600,
			});
		}
	} // }}}

	protected async serializeUserSettings(config: WorkspaceConfiguration, userDataPath: string): Promise<void> { // {{{
		Logger.info('serialize settings');

		let editor: string | undefined;

		const editorPath = this.getEditorUserSettingsPath(userDataPath);
		if(await exists(editorPath)) {
			const ignoredSettings = this.getIgnoredSettings(config);

			editor = await fse.readFile(editorPath, 'utf-8');
			editor = comment(removeProperties(editor, ignoredSettings));
		}

		const dataPath = this.getProfileUserSettingsPath();

		if(editor) {
			await fse.writeFile(dataPath, editor, {
				encoding: 'utf-8',
				mode: 0o600,
			});
		}
		else {
			await fse.remove(dataPath);
		}
	} // }}}

	protected async shouldRestartApp(resources: Resource[], userDataPath: string): Promise<boolean> { // {{{
		if(!(resources.includes(Resource.UIState) || resources.includes(Resource.Extensions))) {
			return false;
		}

		const extensions = await this.listProfileExtensions();

		if((extensions.disabled.length > 0 || extensions.builtin) && !(await this.canManageExtensions())) {
			return true;
		}

		const editor = await this.listEditorUIStateProperties(userDataPath, extensions);
		const profile = await this.listProfileUIStateProperties();

		for(const [key, value] of Object.entries(profile)) {
			if(value !== editor[key]) {
				return true;
			}
		}

		return false;
	} // }}}
}
