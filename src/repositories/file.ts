import path from 'path';
import process from 'process';
import { createHash } from 'crypto';
import vscode, { WorkspaceConfiguration } from 'vscode';
import yaml from 'yaml';
import globby from 'globby';
import fse from 'fs-extra';
import untildify from 'untildify';
import { comment } from '@daiyam/jsonc-preprocessor';
import { ExtensionList, Repository, Resource } from '../repository';
import { RepositoryType } from '../repository-type';
import { Settings } from '../settings';
import { Logger } from '../utils/logger';
import { exists } from '../utils/exists';
import { getUserDataPath } from '../utils/get-user-data-path';
import { uninstallExtension } from '../utils/uninstall-extension';
import { installExtension } from '../utils/install-extension';
import { disableExtension } from '../utils/disable-extension';
import { enableExtension } from '../utils/enable-extension';
import { removeProperties } from '../utils/remove-properties';
import { extractProperties } from '../utils/extract-properties';
import { preprocessJSONC } from '../utils/preprocess-jsonc';
import { insertProperties } from '../utils/insert-properties';
import { arrayDiff } from '../utils/array-diff';

interface ProfileSettings {
	extends?: string;
}

interface ProfileSyncSettings {
	keybindingsPerPlatform?: boolean;
	ignoredExtensions?: string[];
	ignoredSettings?: string[];
	resources?: Resource[];
}

export class FileRepository extends Repository {
	protected _rootPath: string;

	constructor(settings: Settings, rootPath?: string) { // {{{
		super(settings);

		this._rootPath = untildify(rootPath ?? settings.repository.path!);
	} // }}}

	public override get type() { // {{{
		return RepositoryType.FILE;
	} // }}}

	public override async download(): Promise<void> { // {{{
		await this.restoreProfile();
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

	public override getProfileSettingsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'profile.yml');
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

	public override async restoreProfile(): Promise<void> { // {{{
		this.checkInitialized();

		Logger.info(`restore profile "${this.profile}" from ${this._rootPath}`);

		const syncSettings = await this.loadProfileSyncSettings();
		const userDataPath = getUserDataPath(this._settings);
		const ancestorProfile = await this.getAncestorProfile(this.profile);

		let reloadWindow = true;

		for(const resource of syncSettings.resources ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets]) {
			// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
			switch(resource) {
				case Resource.Extensions:
					reloadWindow = await this.restoreExtensions(syncSettings);
					break;
				case Resource.Keybindings:
					await this.restoreKeybindings(ancestorProfile, userDataPath);
					break;
				case Resource.Settings:
					await this.restoreUserSettings(ancestorProfile, userDataPath);
					break;
				case Resource.Snippets:
					await this.restoreSnippets(userDataPath);
					break;
			}
		}

		Logger.info('restore done');

		if(reloadWindow) {
			await vscode.commands.executeCommand('workbench.action.reloadWindow');
		}
		else {
			Logger.info('window reload cancelled');
		}
	} // }}}

	public override async serializeProfile(): Promise<void> { // {{{
		this.checkInitialized();

		const syncSettings = vscode.workspace.getConfiguration('syncSettings');
		const resources = syncSettings.get<string[]>('resources') ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets];

		Logger.info('serialize to:', this._rootPath);

		const profileSettings = await this.loadProfileSettings();
		const userDataPath = getUserDataPath(this._settings);

		const profileDataPath = this.getProfileDataPath();
		await fse.ensureDir(profileDataPath);

		if(profileSettings.extends) {
			for(const resource of resources) {
				switch(resource) {
					case Resource.Extensions:
						await this.serializeExtensions(profileSettings, syncSettings);
						break;
					case Resource.Snippets:
						await this.serializeSnippets(profileSettings, userDataPath);
						break;
				}
			}
		}
		else {
			for(const resource of resources) {
				switch(resource) {
					case Resource.Extensions:
						await this.serializeExtensions(profileSettings, syncSettings);
						break;
					case Resource.Keybindings:
						await this.serializeKeybindings(syncSettings, userDataPath);
						break;
					case Resource.Settings:
						await this.serializeUserSettings(syncSettings, userDataPath);
						break;
					case Resource.Snippets:
						await this.serializeSnippets(profileSettings, userDataPath);
						break;
				}
			}
		}

		await this.saveProfileSyncSettings(syncSettings);

		Logger.info('serialize done');
	} // }}}

	public override async terminate(): Promise<void> { // {{{
		this.checkInitialized();
	} // }}}

	public override async upload(): Promise<void> { // {{{
		await this.serializeProfile();
	} // }}}

	protected applyExtensionsDiff({ disabled, enabled }: ExtensionList, diff: ExtensionList): ExtensionList { // {{{
		for(const id of diff.disabled) {
			const index = enabled.indexOf(id);
			if(index !== -1) {
				enabled.splice(index, 1);
			}

			if(!disabled.includes(id)) {
				disabled.push(id);
			}
		}

		for(const id of diff.enabled) {
			const index = disabled.indexOf(id);
			if(index !== -1) {
				disabled.splice(index, 1);
			}

			if(!enabled.includes(id)) {
				enabled.push(id);
			}
		}

		if(diff.uninstall) {
			for(const id of diff.uninstall) {
				const index = disabled.indexOf(id);
				if(index !== -1) {
					disabled.splice(index, 1);
				}
				else {
					const index = enabled.indexOf(id);
					if(index !== -1) {
						enabled.splice(index, 1);
					}
				}
			}
		}

		return {
			disabled,
			enabled,
		};
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

	protected getProfileDataPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data');
	} // }}}

	protected getProfileExtensionsPath(profile: string = this.profile): string { // {{{
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

	protected getProfileKeybindingsPath(profile: string, keybindingsPerPlatform: boolean, suffix = ''): string { // {{{
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

	protected getProfileSnippetsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'snippets');
	} // }}}

	protected getProfileSyncSettingsOldPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'config.yml');
	} // }}}

	protected getProfileSyncSettingsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, '.sync.yml');
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

	protected getProfileUserSettingsPath(profile: string = this.profile): string { // {{{
		return path.join(this._rootPath, 'profiles', profile, 'data', 'settings.json');
	} // }}}

	protected async listProfileExtensions(profile: string = this.profile): Promise<ExtensionList> { // {{{
		const settings = await this.loadProfileSettings(profile);
		const extensionsPath = this.getProfileExtensionsPath(profile);

		if(!settings.extends) {
			if(!await exists(extensionsPath)) {
				return { disabled: [], enabled: [] };
			}

			const data = await fse.readFile(extensionsPath, 'utf-8');
			const raw = yaml.parse(data) as { disabled: Array<string | { id: string; uuid: string }>; enabled: Array<string | { id: string; uuid: string }> };

			return {
				disabled: raw.disabled.length === 0 || typeof raw.disabled[0] === 'string' ? raw.disabled as string[] : (raw.disabled as Array<{ id: string; uuid: string }>).map(({ id }) => id),
				enabled: raw.enabled.length === 0 || typeof raw.enabled[0] === 'string' ? raw.enabled as string[] : (raw.enabled as Array<{ id: string; uuid: string }>).map(({ id }) => id),
			};
		}

		if(!await exists(extensionsPath)) {
			return this.listProfileExtensions(settings.extends);
		}

		const data = await fse.readFile(extensionsPath, 'utf-8');
		const raw = yaml.parse(data) as {
			disabled: Array<string | { id: string; uuid: string }>;
			enabled: Array<string | { id: string; uuid: string }>;
			uninstall?: Array<string | { id: string; uuid: string }>;
		};
		const extensions = {
			disabled: raw.disabled.length === 0 || typeof raw.disabled[0] === 'string' ? raw.disabled as string[] : (raw.disabled as Array<{ id: string; uuid: string }>).map(({ id }) => id),
			enabled: raw.enabled.length === 0 || typeof raw.enabled[0] === 'string' ? raw.enabled as string[] : (raw.enabled as Array<{ id: string; uuid: string }>).map(({ id }) => id),
			uninstall: !raw.uninstall ? undefined : (raw.uninstall.length === 0 || typeof raw.uninstall[0] === 'string' ? raw.uninstall as string[] : (raw.uninstall as Array<{ id: string; uuid: string }>).map(({ id }) => id)),
		};

		const ancestors = await this.listProfileExtensions(settings.extends);

		return this.applyExtensionsDiff(ancestors, extensions);
	} // }}}

	protected async listProfileSnippetHashes(profile: string = this.profile): Promise<Record<string, string>> { // {{{
		const settings = await this.loadProfileSettings(profile);
		const dataPath = this.getProfileSnippetsPath(profile);

		let snippets;
		let newFiles;

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
			const hash = hasher.update(data).digest('hex');

			snippets[file] = hash;
		}

		return snippets;
	} // }}}

	protected async listProfileSnippetPaths(profile: string = this.profile): Promise<Record<string, string>> { // {{{
		const settings = await this.loadProfileSettings(profile);
		const dataPath = this.getProfileSnippetsPath(profile);

		let snippets;
		let newFiles;

		if(settings.extends) {
			snippets = await this.listProfileSnippetPaths(settings.extends);

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

		for(const file of newFiles) {
			snippets[file] = path.join(dataPath, file);
		}

		return snippets;
	} // }}}

	protected async loadProfileSettings(profile: string = this.profile): Promise<ProfileSettings> { // {{{
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
					throw new Error('sync settings file of profile can not be found');
				}
			}
		}

		const data = await fse.readFile(path, 'utf-8');

		return yaml.parse(data) as ProfileSyncSettings;
	} // }}}

	protected async restoreExtensions(syncSettings: ProfileSyncSettings): Promise<boolean> { // {{{
		Logger.info('restore extensions');

		let reloadWindow = true;

		const editor = await this.listEditorExtensions(syncSettings.ignoredExtensions ?? []);

		const installed: Record<string, boolean> = {};

		const currentlyDisabled: Record<string, boolean> = {};
		for(const id of editor.disabled) {
			currentlyDisabled[id] = true;
			installed[id] = true;
		}

		const currentlyEnabled: Record<string, boolean> = {};
		for(const id of editor.enabled) {
			currentlyEnabled[id] = true;
			installed[id] = true;
		}

		const { disabled, enabled, uninstall } = await this.listProfileExtensions();

		if(await this.canManageExtensions()) {
			for(const id of disabled) {
				if(!installed[id]) {
					reloadWindow = await installExtension(id) && reloadWindow;

					await disableExtension(id);
				}
				else if(currentlyEnabled[id]) {
					await disableExtension(id);
				}

				installed[id] = false;
			}

			for(const id of enabled) {
				if(!installed[id]) {
					reloadWindow = await installExtension(id) && reloadWindow;
				}
				else if(currentlyDisabled[id]) {
					await enableExtension(id);
				}

				installed[id] = false;
			}

			for(const id in installed) {
				if(installed[id]) {
					reloadWindow = await uninstallExtension(id) && reloadWindow;
				}
			}
		}
		else {
			for(const id of disabled) {
				if(currentlyDisabled[id]) {
					installed[id] = false;
				}
			}

			for(const id of enabled) {
				if(!installed[id]) {
					reloadWindow = await installExtension(id) && reloadWindow;
				}
				else if(currentlyDisabled[id]) {
					reloadWindow = await uninstallExtension(id) && reloadWindow;
					reloadWindow = await installExtension(id) && reloadWindow;
				}

				installed[id] = false;
			}

			for(const id in installed) {
				if(installed[id]) {
					reloadWindow = await uninstallExtension(id) && reloadWindow;
				}
			}
		}

		if(uninstall) {
			for(const id of uninstall) {
				if(installed[id]) {
					reloadWindow = await uninstallExtension(id) && reloadWindow;
				}
			}
		}

		return reloadWindow;
	} // }}}

	protected async restoreKeybindings(ancestorProfile: string, userDataPath: string): Promise<void> { // {{{
		Logger.info('restore keybindings');

		const syncSettings = await this.loadProfileSyncSettings(ancestorProfile);
		const dataPath = this.getEditorKeybindingsPath(userDataPath);
		const keybindingsPerPlatform = syncSettings.keybindingsPerPlatform ?? true;

		let data = await this.getProfileKeybindings(ancestorProfile, keybindingsPerPlatform);

		if(data) {
			data = preprocessJSONC(data, this._settings);
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
			data = preprocessJSONC(data, this._settings);
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
		const diffPath = this.getDiffSnippetsPath();
		if(await exists(diffPath)) {
			const data = await fse.readFile(diffPath, 'utf-8');
			const diff = yaml.parse(data) as { remove: string[] };

			ignore.push(...diff.remove);
		}

		const snippets = await this.listProfileSnippetPaths();
		for(const [name, snippetPath] of Object.entries(snippets)) {
			if(ignore.includes(name)) {
				continue;
			}

			await fse.copyFile(snippetPath, path.join(snippetsPath, name));
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

		for(const property of ['keybindingsPerPlatform', 'ignoredExtensions', 'ignoredSettings', 'resources']) {
			const data = config.inspect(property);

			if(data && typeof data.globalValue !== 'undefined') {
				settings[property] = data.globalValue;

				// @ts-expect-error
				if(!ancestors || ancestors[property]! !== data.globalValue) {
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

	protected async serializeExtensions(profileSettings: ProfileSettings, config: WorkspaceConfiguration): Promise<void> { // {{{
		Logger.info('serialize extensions');

		const ignoredExtensions = config.get<string[]>('ignoredExtensions') ?? [];

		let list: ExtensionList;

		if(profileSettings.extends) {
			const profile = await this.listProfileExtensions(profileSettings.extends);
			const editor = await this.listEditorExtensions(ignoredExtensions);

			const disabled = arrayDiff(editor.disabled, profile.disabled);
			const enabled = arrayDiff(editor.enabled, profile.enabled);
			const uninstall = arrayDiff([...profile.disabled, ...profile.enabled], [...editor.disabled, ...editor.enabled]);

			list = {
				disabled,
				enabled,
			};

			if(uninstall.length > 0) {
				list.uninstall = uninstall;
			}
		}
		else {
			list = await this.listEditorExtensions(ignoredExtensions);
		}

		const data = yaml.stringify(list);

		await fse.writeFile(this.getProfileExtensionsPath(), data, {
			encoding: 'utf-8',
			mode: 0o600,
		});
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
			const remove = [];

			if(editor.length > 0) {
				for(const file of editor) {
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
						remove.push(file);
					}
				}
			}
			else {
				remove.push(...Object.keys(profile));
			}

			if(remove.length > 0) {
				const data = yaml.stringify({ remove });
				const dataPath = this.getDiffSnippetsPath();

				await fse.writeFile(dataPath, data, {
					encoding: 'utf-8',
					mode: 0o600,
				});
			}
		}

		const dataPath = this.getProfileSnippetsPath();

		if(editor.length > 0) {
			await fse.emptyDir(dataPath);

			for(const file of editor) {
				const src = path.join(snippetsPath, file);
				const dst = path.join(dataPath, file);

				await fse.copyFile(src, dst);
			}
		}
		else {
			await fse.remove(dataPath);
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
}
