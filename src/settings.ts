import fs from 'fs/promises';
import { ExtensionContext, Uri } from 'vscode';
import yaml from 'yaml';
import { RepositoryType } from './repository-type';
import { exists } from './utils/exists';
import { Logger } from './utils/logger';

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

function defaultIncludes() { // {{{
	return ['**', '!workspaceStorage', '!globalStorage'];
} // }}}

export interface RepositorySettings {
	type: RepositoryType;
	path?: string;
	url?: string;
	branch?: string;
}

export interface SettingsData {
	hostname: string;
	repository: RepositorySettings;
	profile: string;
	includes?: string[];
}

export class Settings {
	public readonly extensionId: string;
	public readonly globalStorageUri: Uri;
	public readonly settingsUri: Uri;

	private _hostname!: string;
	private _includes!: string[];
	private _profile!: string;
	private _repository!: RepositorySettings;
	private _useDefaultIncludes!: boolean;

	private constructor(id: string, globalStorageUri: Uri, settingsUri: Uri, data: SettingsData) { // {{{
		this.extensionId = id;
		this.globalStorageUri = globalStorageUri;
		this.settingsUri = settingsUri;

		this.set(data);
	} // }}}

	public static get(): Settings { // {{{
		if($instance) {
			return $instance;
		}

		throw new Error('The settings are not initialized');
	} // }}}

	public static getRepositoryPath(): string { // {{{
		const settings = Settings.get();

		return Uri.joinPath(settings.globalStorageUri, 'repository').fsPath;
	} // }}}

	public get includes() { // {{{
		return this._includes;
	} // }}}

	public get profile() { // {{{
		return this._profile;
	} // }}}

	public get repository() { // {{{
		return this._repository;
	} // }}}

	public static async load(context: ExtensionContext): Promise<Settings> { // {{{
		const settingsPath = Uri.joinPath(context.globalStorageUri, 'settings.yml');

		const data = await exists(settingsPath.fsPath) ? await fs.readFile(settingsPath.fsPath, 'utf-8') : null;

		if(data) {
			$instance = new Settings(context.extension.id, context.globalStorageUri, settingsPath, yaml.parse(data));
		}
		else {
			$instance = new Settings(context.extension.id, context.globalStorageUri, settingsPath, defaults());

			await $instance.save();
		}

		return $instance;
	} // }}}

	public async reload(): Promise<void> { // {{{
		const data = await exists(this.settingsUri.fsPath) ? await fs.readFile(this.settingsUri.fsPath, 'utf-8') : null;

		if(data) {
			this.set(yaml.parse(data));
		}
		else {
			this.set(defaults());
		}
	} // }}}

	public async save(): Promise<void> { // {{{
		const settings: SettingsData = {
			hostname: this._hostname,
			repository: this._repository,
			profile: this._profile,
		};

		if(!this._useDefaultIncludes) {
			settings.includes = this._includes;
		}

		const data = yaml.stringify(settings);

		await fs.mkdir(Uri.joinPath(this.settingsUri, '..').fsPath, { recursive: true });

		await fs.writeFile(this.settingsUri.fsPath, data, {
			encoding: 'utf-8',
			mode: 0o600,
		});
	} // }}}

	public async setProfile(profile: string): Promise<void> { // {{{
		this._profile = profile;

		return this.save();
	} // }}}

	private set(data: SettingsData) { // {{{
		Logger.info('repository:', JSON.stringify(data.repository));

		this._hostname = data.hostname;
		this._repository = data.repository;
		this._profile = data.profile;

		if(data.includes) {
			this._includes = data.includes;
			this._useDefaultIncludes = false;
		}
		else {
			this._includes = defaultIncludes();
			this._useDefaultIncludes = true;
		}
	} // }}}
}
