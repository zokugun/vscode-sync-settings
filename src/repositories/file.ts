import fs from 'fs/promises';
import path from 'path';
import vscode from 'vscode';
import yaml from 'yaml';
import globby from 'globby';
import fse from 'fs-extra';
import { ExtensionList, Repository } from '../repository';
import { RepositoryType } from '../repository-type';
import { Settings } from '../settings';
import { Logger } from '../utils/logger';
import { exists } from '../utils/exists';
import { getUserDataPath } from '../utils/get-user-data-path';

export interface FileSettings {
	path: string;
}

export class FileRepository extends Repository {
	protected _rootPath: string;

	constructor({ path }: FileSettings) { // {{{
		super();

		this._rootPath = path;
	} // }}}

	public override get type() { // {{{
		return RepositoryType.FILE;
	} // }}}

	public override async download(): Promise<void> { // {{{
		this.checkInitialized();

		const settings = Settings.get();

		Logger.info('download from:', this._rootPath);

		this._reloadWindow = true;

		await this.downloadFiles(settings);
		await this.downloadExtensions(settings);

		Logger.info('download done');

		if(this._reloadWindow) {
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

		const settings = Settings.get();

		Logger.info('upload to:', this._rootPath);

		await this.uploadFiles(settings);
		await this.uploadExtensions();

		Logger.info('upload done');
	} // }}}

	protected async downloadExtensions(settings: Settings): Promise<void> { // {{{
		const listPath = this.getProfileExtensionsPath();
		if(!await exists(listPath)) {
			return;
		}

		const extensions = await this.listExtensions();

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
					await this.installExtension(id);
				}
				else if(currentlyEnabled[id]) {
					await this.disableExtension(id);
				}

				installed[id] = false;
			}

			for(const { id } of enabled) {
				if(!installed[id]) {
					await this.installExtension(id);
				}
				else if(currentlyDisabled[id]) {
					await this.enableExtension(id);
				}

				installed[id] = false;
			}

			for(const id in installed) {
				if(installed[id] && id !== settings.extensionId) {
					await this.uninstallExtension(id);
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
					await this.installExtension(id);
				}
				else if(currentlyDisabled[id]) {
					await this.uninstallExtension(id);
					await this.installExtension(id);
				}

				installed[id] = false;
			}

			for(const id in installed) {
				if(installed[id] && id !== settings.extensionId) {
					await this.uninstallExtension(id);
				}
			}
		}
	} // }}}

	protected async downloadFiles(settings: Settings): Promise<void> { // {{{
		const profileDataPath = this.getProfileDataPath();
		if(!await exists(profileDataPath)) {
			return;
		}

		const profileFiles = await this.listProfileFiles(profileDataPath);

		const userDataPath = getUserDataPath(settings);

		const userFiles: Record<string, boolean> = {};
		for(const file of await this.listUserFiles(userDataPath)) {
			userFiles[file] = true;
		}

		for(const file of profileFiles) {
			const target = path.join(userDataPath, file);

			if(await exists(target)) {
				await fs.unlink(target);
			}
			else {
				await fs.mkdir(path.dirname(target), { recursive: true });
			}

			await fs.copyFile(path.join(profileDataPath, file), target);

			userFiles[file] = false;
		}

		for(const file in userFiles) {
			if(userFiles[file]) {
				await fs.unlink(path.join(profileDataPath, file));
			}
		}
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

	protected async uploadExtensions(): Promise<void> { // {{{
		const { disabled, enabled } = await this.listExtensions();

		const data = yaml.stringify({
			disabled,
			enabled,
		});

		await fs.writeFile(this.getProfileExtensionsPath(), data, {
			encoding: 'utf-8',
			mode: 0o600,
		});
	} // }}}

	protected async uploadFiles(settings: Settings): Promise<void> { // {{{
		const userDataPath = getUserDataPath(settings);
		const userFiles = await this.listUserFiles(userDataPath);

		const profileDataPath = this.getProfileDataPath();
		await fs.mkdir(profileDataPath, { recursive: true });

		const profileFiles: Record<string, boolean> = {};
		for(const file of await this.listProfileFiles(profileDataPath)) {
			profileFiles[file] = true;
		}

		for(const file of userFiles) {
			const target = path.join(profileDataPath, file);

			if(await exists(target)) {
				await fs.unlink(target);
			}
			else {
				await fs.mkdir(path.dirname(target), { recursive: true });
			}

			if(file === 'settings.json') {
				const input = await fs.readFile(path.join(userDataPath, file), 'utf-8');
				const output = this.filterSettings(input);

				await fs.writeFile(target, output, 'utf-8');
			}
			else {
				await fs.copyFile(path.join(userDataPath, file), target);
			}

			profileFiles[file] = false;
		}

		for(const file in profileFiles) {
			if(profileFiles[file]) {
				await fs.unlink(path.join(profileDataPath, file));
			}
		}
	} // }}}
}
