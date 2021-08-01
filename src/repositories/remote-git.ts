import fs from 'fs/promises';
import fse from 'fs-extra';
import { ResetMode } from 'simple-git';
import { Settings } from '../settings';
import { exists } from '../utils/exists';
import { Logger } from '../utils/logger';
import { CommitType, LocalGitRepository } from './local-git';

export class RemoteGitRepository extends LocalGitRepository {
	protected _remoteUrl: string;
	protected _pushRegex: RegExp;

	constructor(settings: Settings) { // {{{
		super(settings, Settings.getRepositoryPath());

		this._remoteUrl = settings.repository.url!;

		this._pushRegex = new RegExp(`${this._branch} pushes to ${this._branch} (up to date)`);
	} // }}}

	public override async download(): Promise<void> { // {{{
		this.checkInitialized();

		if(!await this.pull()) {
			return Logger.error('can not pull git repository');
		}

		await super.download();
	} // }}}

	public override async terminate(): Promise<void> { // {{{
		await fse.remove(this._rootPath);
	} // }}}

	protected async createLocalRepository(remove: boolean): Promise<boolean> { // {{{
		if(remove) {
			await fse.remove(this._rootPath);
		}

		await fs.mkdir(this._rootPath, { recursive: true });

		await this._git.cwd(this._rootPath);

		Logger.info('creating git at', this._rootPath);
		await this._git.init({
			'--initial-branch': this._branch,
		});

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
	} // }}}

	protected override async pull(): Promise<boolean> { // {{{
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
	} // }}}

	protected override async push(type: CommitType, profile: string = this._profile): Promise<void> { // {{{
		await super.push(type, profile);

		const status = await this._git.remote(['show', 'origin']);

		if(!status || !this._pushRegex.test(status)) {
			Logger.info('push to remote');

			await this._git.push('origin', this._branch, { '--force': null });

			Logger.info('push done');
		}
	} // }}}
}
