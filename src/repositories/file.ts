import fs from 'fs/promises';
import path from 'path';
import process from 'process';
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
import { preprocessJSON } from '../utils/preprocess-json';
import { insertProperties } from '../utils/insert-properties';

interface ProfileConfig {
	keybindingsPerPlatform?: boolean;
	ignoredExtensions?: string[];
	ignoredSettings?: string[];
	resources?: Resource[];
}

interface Transformer {
	rename?: (file: string) => string;
	replace?: (text: string) => string;
	test?: (file: string) => boolean;
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
		this.checkInitialized();

		Logger.info('download from:', this._rootPath);

		const config = await this.downloadProfileConfig();

		const profileDataPath = this.getProfileDataPath();
		const userDataPath = getUserDataPath(this._settings);

		let reloadWindow = true;

		for(const resource of config.resources ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets]) {
			// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
			switch(resource) {
				case Resource.Extensions:
					reloadWindow = await this.downloadExtensions(config.ignoredExtensions ?? []);
					break;
				case Resource.Keybindings:
					await this.downloadKeybindings(config, userDataPath, profileDataPath);
					break;
				case Resource.Settings:
					await this.downloadSettings(config, userDataPath, profileDataPath);
					break;
				case Resource.Snippets:
					await this.downloadSnippets(userDataPath, profileDataPath);
					break;
			}
		}

		Logger.info('download done');

		if(reloadWindow) {
			await vscode.commands.executeCommand('workbench.action.reloadWindow');
		}
		else {
			Logger.info('window reload cancelled');
		}
	} // }}}

	public override async duplicateProfileTo(originalProfile: string, newProfile: string): Promise<void> { // {{{
		this.checkInitialized();

		await fse.copy(path.join(this._rootPath, 'profiles', originalProfile), path.join(this._rootPath, 'profiles', newProfile));
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

	public override async terminate(): Promise<void> { // {{{
		this.checkInitialized();
	} // }}}

	public override async upload(): Promise<void> { // {{{
		this.checkInitialized();

		const config = vscode.workspace.getConfiguration('syncSettings');
		const resources = config.get<string[]>('resources') ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets];

		Logger.info('upload to:', this._rootPath);

		const userDataPath = getUserDataPath(this._settings);

		const profileDataPath = this.getProfileDataPath();
		await fs.mkdir(profileDataPath, { recursive: true });

		const profileFiles: Record<string, boolean> = {};
		for(const file of await this.listProfileFiles(profileDataPath)) {
			profileFiles[file] = true;
		}

		for(const resource of resources) {
			switch(resource) {
				case Resource.Extensions:
					await this.uploadExtensions(config);
					break;
				case Resource.Keybindings:
					await this.uploadKeybindings(config, userDataPath, profileDataPath, profileFiles);
					break;
				case Resource.Settings:
					await this.uploadSettings(config, userDataPath, profileDataPath, profileFiles);
					break;
				case Resource.Snippets:
					await this.uploadSnippets(userDataPath, profileDataPath, profileFiles);
					break;
			}
		}

		for(const file in profileFiles) {
			if(profileFiles[file]) {
				await fs.unlink(path.join(profileDataPath, file));
			}
		}

		await this.uploadProfileConfig(config);

		Logger.info('upload done');
	} // }}}

	protected async downloadExtensions(ignoredExtensions: string[]): Promise<boolean> { // {{{
		Logger.info('download extensions');

		const listPath = this.getProfileExtensionsPath();
		if(!await exists(listPath)) {
			return false;
		}

		let reloadWindow = true;

		const extensions = await this.listExtensions(ignoredExtensions);

		const installed: Record<string, boolean> = {};

		const currentlyDisabled: Record<string, boolean> = {};
		for(const { id } of extensions.disabled) {
			currentlyDisabled[id] = true;
			installed[id] = true;
		}

		const currentlyEnabled: Record<string, boolean> = {};
		for(const { id } of extensions.enabled) {
			currentlyEnabled[id] = true;
			installed[id] = true;
		}

		const data = await fs.readFile(listPath, 'utf-8');
		const { disabled, enabled } = yaml.parse(data) as ExtensionList;

		if(await this.canManageExtensions()) {
			for(const { id } of disabled) {
				if(!installed[id]) {
					reloadWindow = await installExtension(id) && reloadWindow;

					await disableExtension(id);
				}
				else if(currentlyEnabled[id]) {
					await disableExtension(id);
				}

				installed[id] = false;
			}

			for(const { id } of enabled) {
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
			for(const { id } of disabled) {
				if(currentlyDisabled[id]) {
					installed[id] = false;
				}
			}

			for(const { id } of enabled) {
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

		return reloadWindow;
	} // }}}

	protected async downloadFiles(userDataPath: string, profileDataPath: string, profileFiles: string[], fn: Transformer = {}): Promise<void> { // {{{
		fn.rename ??= (file) => file;
		fn.replace ??= (text) => text;
		fn.test ??= () => false;

		for(const file of profileFiles) {
			const newFile = fn.rename(file);
			const target = path.join(userDataPath, newFile);

			if(await exists(target)) {
				await fs.unlink(target);
			}
			else {
				await fs.mkdir(path.dirname(target), { recursive: true });
			}

			if(fn.test(file)) {
				const text = await fs.readFile(path.join(profileDataPath, file), 'utf-8');

				await fs.writeFile(target, fn.replace(text), 'utf-8');
			}
			else {
				await fs.copyFile(path.join(profileDataPath, file), target);
			}
		}
	} // }}}

	protected async downloadKeybindings(config: ProfileConfig, userDataPath: string, profileDataPath: string): Promise<void> { // {{{
		Logger.info('download keybindings');

		const keybindingsPerPlatform = config.keybindingsPerPlatform ?? true;

		let file = 'keybindings.json';

		if(keybindingsPerPlatform) {
			// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
			switch(process.platform) {
				case 'darwin':
					file = `${file.slice(0, -5)}-macos.json`;
					break;
				case 'linux':
					file = `${file.slice(0, -5)}-linux.json`;
					break;
				case 'win32':
					file = `${file.slice(0, -5)}-windows.json`;
					break;
			}
		}

		await this.downloadFiles(userDataPath, profileDataPath, [file], {
			rename: () => 'keybindings.json',
			test: () => true,
			replace: (text) => preprocessJSON(text, this._settings),
		});
	} // }}}

	protected async downloadProfileConfig(): Promise<ProfileConfig> { // {{{
		const profileConfigPath = this.getProfileConfigPath();

		if(!await exists(profileConfigPath)) {
			throw new Error('config file of profile can not be found');
		}

		const data = await fs.readFile(profileConfigPath, 'utf-8');

		return yaml.parse(data) as ProfileConfig;
	} // }}}

	protected async downloadSettings(config: ProfileConfig, userDataPath: string, profileDataPath: string): Promise<void> { // {{{
		Logger.info('download settings');

		let extract = '';

		const settings = await this.getSettingsFile(userDataPath);
		if(settings) {
			const ignoredSettings = config.ignoredSettings ?? [];
			const text = await fs.readFile(path.join(userDataPath, settings), 'utf-8');

			extract = extractProperties(text, ignoredSettings);
		}

		await this.downloadFiles(userDataPath, profileDataPath, ['settings.json'], {
			test: () => true,
			replace: (text) => {
				text = preprocessJSON(text, this._settings);

				if(extract.length > 0) {
					text = insertProperties(text, extract);
				}

				return text;
			},
		});
	} // }}}

	protected async downloadSnippets(userDataPath: string, profileDataPath: string): Promise<void> { // {{{
		Logger.info('download snippets');

		const profileFiles = await this.listSnippets(profileDataPath);

		await this.downloadFiles(userDataPath, profileDataPath, profileFiles);
	} // }}}

	protected getProfileConfigPath(): string { // {{{
		return path.join(this._rootPath, 'profiles', this.profile, 'config.yml');
	} // }}}

	protected getProfileDataPath(): string { // {{{
		return path.join(this._rootPath, 'profiles', this.profile, 'data');
	} // }}}

	protected getProfileExtensionsPath(): string { // {{{
		return path.join(this._rootPath, 'profiles', this.profile, 'extensions.yml');
	} // }}}

	protected async listProfileFiles(cwd: string): Promise<string[]> { // {{{
		return globby('**', {
			cwd,
			followSymbolicLinks: false,
		});
	} // }}}

	protected async uploadExtensions(config: WorkspaceConfiguration): Promise<void> { // {{{
		Logger.info('upload extensions');

		const ignoredExtensions = config.get<string[]>('ignoredExtensions') ?? [];

		const { disabled, enabled } = await this.listExtensions(ignoredExtensions);

		const data = yaml.stringify({
			disabled,
			enabled,
		});

		await fs.writeFile(this.getProfileExtensionsPath(), data, {
			encoding: 'utf-8',
			mode: 0o600,
		});
	} // }}}

	protected async uploadFiles(userDataPath: string, userFiles: string[], profileDataPath: string, profileFiles: Record<string, boolean>, fn: Transformer = {}): Promise<void> { // {{{
		fn.rename ??= (file) => file;
		fn.replace ??= (text) => text;
		fn.test ??= () => false;

		for(const file of userFiles) {
			const newFile = fn.rename(file);
			const target = path.join(profileDataPath, newFile);

			if(await exists(target)) {
				await fs.unlink(target);
			}
			else {
				await fs.mkdir(path.dirname(target), { recursive: true });
			}

			if(fn.test(file)) {
				const text = await fs.readFile(path.join(userDataPath, file), 'utf-8');

				await fs.writeFile(target, fn.replace(text), 'utf-8');
			}
			else {
				await fs.copyFile(path.join(userDataPath, file), target);
			}

			profileFiles[newFile] = false;
		}
	} // }}}

	protected async uploadKeybindings(config: WorkspaceConfiguration, userDataPath: string, profileDataPath: string, profileFiles: Record<string, boolean>): Promise<void> { // {{{
		Logger.info('upload keybindings');

		const keybindingsPerPlatform = config.get<boolean>('keybindingsPerPlatform') ?? true;

		const keybindings = await this.getKeybindingsFile(userDataPath);

		if(keybindings) {
			await this.uploadFiles(userDataPath, [keybindings], profileDataPath, profileFiles, {
				rename: (file) => {
					if(!keybindingsPerPlatform || !file.endsWith('.json')) {
						return file;
					}

					// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
					switch(process.platform) {
						case 'darwin':
							return `${file.slice(0, -5)}-macos.json`;
						case 'linux':
							return `${file.slice(0, -5)}-linux.json`;
						case 'win32':
							return `${file.slice(0, -5)}-windows.json`;
					}

					return file;
				},
				test: () => true,
				replace: (text) => comment(text),
			});
		}
	} // }}}

	protected async uploadProfileConfig(config: WorkspaceConfiguration): Promise<void> { // {{{
		const settings: Record<string, any> = {};

		for(const property of ['keybindingsPerPlatform', 'ignoredExtensions', 'ignoredSettings', 'resources']) {
			const data = config.inspect(property);

			if(data && typeof data.globalValue !== 'undefined') {
				settings[property] = data.globalValue;
			}
		}

		const data = yaml.stringify(settings);

		await fs.writeFile(this.getProfileConfigPath(), data, 'utf-8');
	} // }}}

	protected async uploadSettings(config: WorkspaceConfiguration, userDataPath: string, profileDataPath: string, profileFiles: Record<string, boolean>): Promise<void> { // {{{
		Logger.info('upload settings');

		const settings = await this.getSettingsFile(userDataPath);

		if(settings) {
			const ignoredSettings = this.getIgnoredSettings(config);

			await this.uploadFiles(userDataPath, [settings], profileDataPath, profileFiles, {
				test: () => true,
				replace: (text) => comment(removeProperties(text, ignoredSettings)),
			});
		}
	} // }}}

	protected async uploadSnippets(userDataPath: string, profileDataPath: string, profileFiles: Record<string, boolean>): Promise<void> { // {{{
		Logger.info('upload snippets');

		const userFiles = await this.listSnippets(userDataPath);

		await this.uploadFiles(userDataPath, userFiles, profileDataPath, profileFiles);
	} // }}}
}
