import { createHash } from 'crypto';
import fse from 'fs-extra';
import { type ExtensionContext, ExtensionKind, type Terminal, type TerminalOptions, Uri, window } from 'vscode';
import yaml from 'yaml';

import { RepositoryType } from './repository-type.js';
import { exists } from './utils/exists.js';
import { getEditorStorage } from './utils/get-editor-storage.js';
import { Logger } from './utils/logger.js';
import { unsafeCast } from './utils/unsafe-cast.js';

const $hasher = createHash('SHA1');

let $instance: Settings | undefined;
let $terminal: Terminal | undefined;

export enum Hook {
	PostDownload = 'post-download',
	PostUpload = 'post-upload',
	PreDownload = 'pre-download',
	PreUpload = 'pre-upload',
}

export type Hooks = {
	[Hook.PostDownload]?: string | string[];
	[Hook.PostUpload]?: string | string[];
	[Hook.PreDownload]?: string | string[];
	[Hook.PreUpload]?: string | string[];
};

export type RepositorySettings = {
	branch?: string;
	messages?: Record<string, string>;
	path?: string;
	shell?: string;
	type: RepositoryType;
	url?: string;
};

type SettingsData = {
	hooks?: Hooks;
	hostname?: string;
	profile?: string;
	repository?: RepositorySettings;
};

export class Settings {
	public static get(): Settings { // {{{
		if($instance) {
			return $instance;
		}

		throw new Error('The settings are not initialized');
	} // }}}

	public static async getTerminal(workingDirectory: string): Promise<Terminal> { // {{{
		if(!$terminal) {
			$terminal = window.createTerminal({
				name: 'Sync Settings',
				cwd: workingDirectory,
				isTransient: true,
			});
		}
		else if(($terminal.creationOptions as TerminalOptions).cwd === workingDirectory) {
			await $terminal.processId.then((processId) => {
				if(!processId) {
					$terminal = window.createTerminal({
						name: 'Sync Settings',
						cwd: workingDirectory,
						isTransient: true,
					});
				}
			});
		}
		else {
			$terminal.dispose();

			$terminal = window.createTerminal({
				name: 'Sync Settings',
				cwd: workingDirectory,
				isTransient: true,
			});
		}

		$terminal.show(false);

		return $terminal;
	} // }}}

	public static async load(context: ExtensionContext): Promise<Settings> { // {{{
		const settingsPath = Uri.joinPath(context.globalStorageUri, 'settings.yml');

		$instance = new Settings(context.extension.id, context.globalStorageUri, settingsPath, context.extension.extensionKind === ExtensionKind.Workspace);

		const data = await exists(settingsPath.fsPath) ? await fse.readFile(settingsPath.fsPath, 'utf8') : null;

		if(data) {
			$instance.set(unsafeCast<SettingsData>(yaml.parse(data) ?? {}));

			$instance._hash = $hasher.copy().update(data ?? '').digest('hex');
		}
		else {
			const defaultSettingsPath = Uri.joinPath(context.extensionUri, 'src', 'resources', 'default-settings.yml');

			if(await exists(defaultSettingsPath.fsPath)) {
				const data = await fse.readFile(defaultSettingsPath.fsPath, 'utf8');

				$instance.set(unsafeCast<SettingsData>(yaml.parse(data) ?? {}));

				await fse.ensureDir(Uri.joinPath($instance.settingsUri, '..').fsPath);

				await fse.writeFile($instance.settingsUri.fsPath, data, {
					encoding: 'utf8',
					mode: 0o600,
				});

				$instance._hash = $hasher.copy().update(data ?? '').digest('hex');
			}
			else {
				$instance.set(defaults());

				await $instance.save();
			}
		}

		void getEditorStorage(context);

		return $instance;
	} // }}}

	public readonly extensionId: string;
	public readonly globalStorageUri: Uri;
	public readonly remote: boolean;
	public readonly settingsUri: Uri;

	private _hash = '';
	private _hooks: Hooks = {};
	private _hostname?: string;
	private _profile: string = '';
	private _repository: RepositorySettings = {
		type: RepositoryType.DUMMY,
	};

	private constructor(id: string, globalStorageUri: Uri, settingsUri: Uri, remote: boolean) { // {{{
		this.extensionId = id;
		this.globalStorageUri = globalStorageUri;
		this.settingsUri = settingsUri;
		this.remote = remote;
	} // }}}

	public get hooks(): Hooks { // {{{
		return this._hooks;
	} // }}}

	public get hostname(): string | undefined { // {{{
		return this._hostname;
	} // }}}

	public get profile(): string { // {{{
		return this._profile;
	} // }}}

	public get repository(): RepositorySettings { // {{{
		return this._repository;
	} // }}}

	public async reload(): Promise<boolean> { // {{{
		const data = await exists(this.settingsUri.fsPath) ? await fse.readFile(this.settingsUri.fsPath, 'utf8') : null;
		const hash = $hasher.copy().update(data ?? '').digest('hex');

		if(this._hash === hash) {
			return false;
		}
		else {
			if(data) {
				this.set(unsafeCast<SettingsData>(yaml.parse(data) ?? {}));
			}
			else {
				this.set(defaults());
			}

			this._hash = hash;

			return true;
		}
	} // }}}

	public async save(): Promise<void> { // {{{
		const settings: SettingsData = {};

		if(Object.keys(this._hooks).length > 0) {
			settings.hooks = this._hooks;
		}

		if(typeof this._hostname === 'string') {
			settings.hostname = this._hostname;
		}

		settings.profile = this._profile;
		settings.repository = this._repository;

		settings.profile = this._profile;
		settings.repository = this._repository;

		const data = yaml.stringify(settings);

		this._hash = $hasher.copy().update(data ?? '').digest('hex');

		await fse.ensureDir(Uri.joinPath(this.settingsUri, '..').fsPath);

		await fse.writeFile(this.settingsUri.fsPath, data, {
			encoding: 'utf8',
			mode: 0o600,
		});
	} // }}}

	public async setProfile(profile: string): Promise<void> { // {{{
		this._profile = profile;

		return this.save();
	} // }}}

	private set(data: SettingsData): void { // {{{
		Logger.info('repository:', JSON.stringify(data.repository, (key: string, value: unknown) => key === 'password' || key === 'token' ? '...' : value));
		if(data.profile) {
			Logger.info('profile:', data.profile);
		}
		else {
			Logger.error('The `profile` property is required');
		}

		if(data.hostname) {
			Logger.info('hostname:', data.hostname);
		}

		if(data.repository) {
			this._hooks = data.hooks ?? {};
			this._hostname = data.hostname;
			this._profile = data.profile ?? '';
			this._repository = data.repository;
		}
		else {
			this._hooks = data.hooks ?? {};
			this._hostname = '';
			this._profile = '';
			this._repository = {
				type: RepositoryType.DUMMY,
			};

			Logger.error('No `repository` property has been defined in the settings');
		}
	} // }}}
}

function defaults(): SettingsData { // {{{
	return {
		hostname: '',
		profile: 'main',
		repository: {
			path: '',
			type: RepositoryType.DUMMY,
		},
	};
} // }}}
