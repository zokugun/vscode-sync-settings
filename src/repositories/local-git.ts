import type { Settings } from '../settings.js';

import fs from 'fs/promises';
import path from 'path';
import fse from 'fs-extra';
import semver from 'semver';
import { simpleGit, type SimpleGit } from 'simple-git';
import vscode from 'vscode';

import { FileRepository } from './file.js';
import { RepositoryType } from '../repository-type.js';
import { exists } from '../utils/exists.js';
import { formatter } from '../utils/formatter.js';
import { hostname } from '../utils/hostname.js';
import { Logger } from '../utils/logger.js';

export enum CommitType {
	INIT = 'init',
	UPDATE = 'update',
}

export class LocalGitRepository extends FileRepository {
	protected _branch: string;
	protected _git: SimpleGit;
	protected _hostname: string;
	protected _initMessage: string;
	protected _updateMessage: string;
	protected _version: string | undefined;

	public constructor(settings: Settings, rootPath?: string) { // {{{
		super(settings, rootPath);

		this._git = simpleGit();
		this._branch = settings.repository.branch ?? 'master';

		const config = vscode.workspace.getConfiguration('syncSettings');
		const { messages } = settings.repository;

		this._initMessage = messages?.init ?? config.get<string>('gitInitMessage') ?? 'profile({{profile}}): init -- {{now|date:iso}}';
		this._updateMessage = messages?.update ?? config.get<string>('gitUpdateMessage') ?? 'profile({{profile}}): update -- {{now|date:iso}}';

		this._hostname = settings.hostname ?? hostname(config);
	} // }}}

	public override get type(): RepositoryType { // {{{
		return RepositoryType.GIT;
	} // }}}

	public override async duplicateProfileTo(originalProfile: string, newProfile: string): Promise<void> { // {{{
		await super.duplicateProfileTo(originalProfile, newProfile);

		const profilePath = path.join(this._rootPath, 'profiles', newProfile);
		const gitkeepPath = path.join(profilePath, '.gitkeep');

		if(!await exists(gitkeepPath)) {
			await fs.mkdir(profilePath, { recursive: true });

			await fs.writeFile(gitkeepPath, '', 'utf8');
		}

		await this.push(CommitType.INIT, newProfile);
	} // }}}

	public override async initialize(): Promise<void> { // {{{
		if(!await this.pull()) {
			Logger.error('The git repository can not be pulled');

			return;
		}

		const profilePath = path.join(this._rootPath, 'profiles', this._profile);
		const gitkeepPath = path.join(profilePath, '.gitkeep');

		if(!await exists(gitkeepPath)) {
			await fs.mkdir(profilePath, { recursive: true });

			await fs.writeFile(gitkeepPath, '', 'utf8');

			if(!await this.push(CommitType.INIT)) {
				return;
			}
		}

		this._initialized = true;
	} // }}}

	public override async pull(): Promise<boolean> { // {{{
		await fse.ensureDir(this._rootPath);

		await this._git.cwd(this._rootPath);

		if(!await this._git.checkIsRepo() && !await this.initRepo()) {
			return false;
		}

		return true;
	} // }}}

	public override async upload(): Promise<boolean> { // {{{
		await super.upload();

		return this.push(CommitType.UPDATE);
	} // }}}

	protected async getVersion(): Promise<string> { // {{{
		if(this._version) {
			return this._version;
		}

		const raw = await this._git.raw('--version');
		const match = /^.{0,32}(\d+\.\d+\.\d+)/.exec(raw);
		this._version = match ? match[1] : '2.0.0';

		return this._version;
	} // }}}

	protected async initRepo(): Promise<boolean> { // {{{
		Logger.info('creating git at', this._rootPath);

		try {
			if(semver.gte(await this.getVersion(), '2.28.0')) {
				await this._git.init({
					'--initial-branch': this._branch,
				});
			}
			else {
				await this._git.init();

				await this._git.checkoutLocalBranch(this._branch);
			}

			return true;
		}
		catch(error) {
			Logger.error(error);

			if(error instanceof Error) {
				void vscode.window.showErrorMessage(
					'Sync Settings: command \'git init\' resulted in an error:',
					{
						detail: error.message,
						modal: true,
					},
				);
			}

			return false;
		}
	} // }}}

	protected async push(type: CommitType, profile: string = this._profile): Promise<boolean> { // {{{
		await this._git.add('.');

		const status = await this._git.status();

		if(status.staged.length === 0) {
			Logger.info('no changes, no commit');
		}
		else {
			const message = formatter(type === CommitType.INIT ? this._initMessage : this._updateMessage, {
				hostname: this._hostname,
				now: new Date(),
				profile,
			});

			Logger.info(`commit: ${message}`);

			try {
				await this._git.commit(message);
			}
			catch(error) {
				Logger.error(error);

				if(error instanceof Error) {
					void vscode.window.showErrorMessage(
						'Sync Settings: command \'git commit\' resulted in an error:',
						{
							detail: error.message,
							modal: true,
						},
					);
				}

				return false;
			}
		}

		return true;
	} // }}}
}
