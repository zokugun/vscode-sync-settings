import { createHash } from 'crypto';
import fse from 'fs-extra';
import { ExtensionContext, Uri } from 'vscode';
import yaml from 'yaml';
import { RepositoryType } from './repository-type';
import { exists } from './utils/exists';
import { Logger } from './utils/logger';

const $hasher = createHash('SHA1');

let $instance: Settings | undefined;

function defaults() { // {{{
	return {
		hostname: '',
		repository: {
			type: RepositoryType.DUMMY,
			path: '',
		},
		profile: 'main',
	};
} // }}}

export interface RepositorySettings {
	branch?: string;
	path?: string;
	shell?: string;
	type: RepositoryType;
	url?: string;
}

interface SettingsData {
	hostname?: string;
	profile?: string;
	repository?: RepositorySettings;
}

export class Settings {
	public readonly extensionId: string;
	public readonly globalStorageUri: Uri;
	public readonly settingsUri: Uri;

	private _hash = '';
	private _hostname: string = '';
	private _profile: string = '';
	private _repository: RepositorySettings = {
		type: RepositoryType.DUMMY,
	};

	private constructor(id: string, globalStorageUri: Uri, settingsUri: Uri) { // {{{
		this.extensionId = id;
		this.globalStorageUri = globalStorageUri;
		this.settingsUri = settingsUri;
	} // }}}

	public static get(): Settings { // {{{
		if($instance) {
			return $instance;
		}

		throw new Error('The settings are not initialized');
	} // }}}

	public get hostname() { // {{{
		return this._hostname;
	} // }}}

	public get profile() { // {{{
		return this._profile;
	} // }}}

	public get repository() { // {{{
		return this._repository;
	} // }}}

	public static async load(context: ExtensionContext): Promise<Settings> { // {{{
		const settingsPath = Uri.joinPath(context.globalStorageUri, 'settings.yml');

		$instance = new Settings(context.extension.id, context.globalStorageUri, settingsPath);

		const data = await exists(settingsPath.fsPath) ? await fse.readFile(settingsPath.fsPath, 'utf-8') : null;

		if(data) {
			$instance.set(yaml.parse(data) ?? {});
		}
		else {
			await $instance.save();
		}

		$instance._hash = $hasher.copy().update(data ?? '').digest('hex');

		return $instance;
	} // }}}

	public async reload(): Promise<boolean> { // {{{
		const data = await exists(this.settingsUri.fsPath) ? await fse.readFile(this.settingsUri.fsPath, 'utf-8') : null;
		const hash = $hasher.copy().update(data ?? '').digest('hex');

		if(this._hash !== hash) {
			if(data) {
				this.set(yaml.parse(data) ?? {});
			}
			else {
				this.set(defaults());
			}

			this._hash = hash;

			return true;
		}
		else {
			return false;
		}
	} // }}}

	public async save(): Promise<void> { // {{{
		const settings: SettingsData = {
			hostname: this._hostname,
			profile: this._profile,
			repository: this._repository,
		};

		const data = yaml.stringify(settings);

		this._hash = $hasher.copy().update(data ?? '').digest('hex');

		await fse.ensureDir(Uri.joinPath(this.settingsUri, '..').fsPath);

		await fse.writeFile(this.settingsUri.fsPath, data, {
			encoding: 'utf-8',
			mode: 0o600,
		});
	} // }}}

	public async setProfile(profile: string): Promise<void> { // {{{
		this._profile = profile;

		return this.save();
	} // }}}

	private set(data: SettingsData) { // {{{
		Logger.info('repository:', JSON.stringify(data.repository, (key: string, value: unknown) => key === 'password' || key === 'token' ? '...' : value));
		Logger.info('profile:', data.profile);

		if(data.hostname) {
			Logger.info('hostname:', data.hostname);
		}

		if(data.repository) {
			this._hostname = data.hostname ?? '';
			this._profile = data.profile ?? '';
			this._repository = data.repository;
		}
		else {
			this._hostname = '';
			this._profile = '';
			this._repository = {
				type: RepositoryType.DUMMY,
			};

			Logger.error('No `repository` property has been defined in the settings');
		}
	} // }}}
}
