import path from 'path';
import Rsync from 'rsync';
import { RepositoryType } from '../repository-type.js';
import { type Settings } from '../settings.js';
import { Logger } from '../utils/logger.js';
import { TemporaryRepository } from '../utils/temporary-repository.js';
import { FileRepository } from './file.js';

export class RsyncRepository extends FileRepository {
	protected _remoteUrl: string;
	protected _shell: string;

	constructor(settings: Settings) { // {{{
		super(settings, TemporaryRepository.getPath(settings));

		this._remoteUrl = settings.repository.url!;
		this._shell = settings.repository.shell ?? 'ssh';
	} // }}}

	public override get type() { // {{{
		return RepositoryType.RSYNC;
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

	public override async upload(): Promise<boolean> { // {{{
		if(await super.upload()) {
			return this.push();
		}

		return false;
	} // }}}

	protected async pull(): Promise<boolean> { // {{{
		Logger.info('pull from remote');

		const rsync = new Rsync()
			.shell(this._shell)
			.flags('az')
			.source(`${this._remoteUrl}/*`)
			.destination(this._rootPath);

		return new Promise((resolve) => {
			rsync.execute((error) => {
				if(error) {
					Logger.error(error);

					resolve(false);
				}
				else {
					Logger.info('pull done');

					resolve(true);
				}
			});
		});
	} // }}}

	protected async push(): Promise<boolean> { // {{{
		Logger.info('push to remote');

		const rsync = new Rsync()
			.shell(this._shell)
			.flags('az')
			.source(path.join(this._rootPath, '*'))
			.destination(this._remoteUrl);

		return new Promise((resolve) => {
			rsync.execute((error) => {
				if(error) {
					Logger.error(error);

					resolve(false);
				}
				else {
					Logger.info('push done');

					resolve(true);
				}
			});
		});
	} // }}}
}
