import fs from 'fs/promises';
import fse from 'fs-extra';
import { ResetMode } from 'simple-git';
import { type Settings } from '../settings.js';
import { exists } from '../utils/exists.js';
import { Logger } from '../utils/logger.js';
import { TemporaryRepository } from '../utils/temporary-repository.js';
import { type CommitType, LocalGitRepository } from './local-git.js';

export class RemoteGitRepository extends LocalGitRepository {
	protected _remoteUrl: string;
	protected _pushRegex: RegExp;

	constructor(settings: Settings) { // {{{
		super(settings, TemporaryRepository.getPath(settings));

		this._remoteUrl = settings.repository.url!;

		this._pushRegex = new RegExp(`${this._branch} pushes to ${this._branch} (up to date)`);
	} // }}}

	public override async download(): Promise<boolean> { // {{{
		this.checkInitialized();

		if(await this.pull()) {
			return super.download();
		}

		return false;
	} // }}}

	public override async initialize(): Promise<void> { // {{{
		await TemporaryRepository.initialize(this._settings, this.type, this._remoteUrl);

		await super.initialize();
	} // }}}

	public override async terminate(): Promise<void> { // {{{
		await TemporaryRepository.terminate(this._settings);
	} // }}}

	protected async createLocalRepository(remove: boolean): Promise<boolean> { // {{{
		try {
			if(remove) {
				await fse.remove(this._rootPath);
			}

			await fs.mkdir(this._rootPath, { recursive: true });

			await this._git.cwd(this._rootPath);

			await this.initRepo();

			Logger.info('adding new remote:', this._remoteUrl);
			await this._git.addRemote('origin', this._remoteUrl);

			Logger.info('fetch from remote');

			await this._git.fetch();

			const branches = await this._git.branch({
				'--all': null,
			});

			if(branches.all.includes(`remotes/origin/${this._branch}`)) {
				Logger.info('pull from remote');

				await this._git.pull('origin', this._branch);

				Logger.info('pull done');
			}

			return true;
		}
		catch (error: unknown) {
			Logger.error(error);

			return false;
		}
	} // }}}

	protected override async pull(): Promise<boolean> { // {{{
		try {
			if(await exists(this._rootPath)) {
				await this._git.cwd(this._rootPath);

				if(await this._git.checkIsRepo()) {
					const status = await this._git.remote(['show', 'origin']);

					if(!status) {
						return this.createLocalRepository(true);
					}

					let match: RegExpMatchArray | null;

					// verify origin
					if((match = /Fetch URL: (\S*)/.exec(status)) && match[1] !== this._remoteUrl) {
						return this.createLocalRepository(true);
					}

					await this._git.fetch();

					// switch branch is needed
					const branch = await this._git.branchLocal();
					if(branch.current !== this._branch) {
						return this.createLocalRepository(true);
					}

					// pull
					if(status.includes('(local out of date)')) {
						// reset files
						await this._git.add('.');
						await this._git.reset(ResetMode.HARD);

						Logger.info('pull from remote');

						await this._git.pull('origin', this._branch);

						Logger.info('pull done');
					}

					return true;
				}
				else {
					return this.createLocalRepository(true);
				}
			}

			return this.createLocalRepository(false);
		}
		catch (error: unknown) {
			Logger.error(error);

			return false;
		}
	} // }}}

	protected override async push(type: CommitType, profile: string = this._profile): Promise<boolean> { // {{{
		try {
			await super.push(type, profile);

			const status = await this._git.remote(['show', 'origin']);

			if(!status || !this._pushRegex.test(status)) {
				Logger.info('push to remote');

				await this._git.push('origin', this._branch, { '--force': null });

				Logger.info('push done');
			}

			return true;
		}
		catch (error: unknown) {
			Logger.error(error);

			return false;
		}
	} // }}}
}
