import path from 'path';
import Rsync from 'rsync';
import { RepositoryType } from '../repository-type';
import { Settings } from '../settings';
import { Logger } from '../utils/logger';
import { TemporaryRepository } from '../utils/temporary-repository';
import { FileRepository } from './file';

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

	public override async download(): Promise<void> { // {{{
		this.checkInitialized();

		await this.pull();

		await super.download();
	} // }}}

	public override async initialize(): Promise<void> { // {{{
		await TemporaryRepository.initialize(this._settings, this.type, this._remoteUrl);

		await super.initialize();
	} // }}}

	public override async terminate(): Promise<void> { // {{{
		await TemporaryRepository.terminate(this._settings);
	} // }}}

	public override async upload(): Promise<void> { // {{{
		await super.upload();

		await this.push();
	} // }}}

	protected async pull(): Promise<void> { // {{{
		Logger.info('pull from remote');

		const rsync = new Rsync()
			.shell(this._shell)
			.flags('az')
			.source(`${this._remoteUrl}/*`)
			.destination(this._rootPath);

		return new Promise((resolve, reject) => {
			rsync.execute((error) => {
				if(error) {
					Logger.error(error);

					reject(error);
				}
				else {
					Logger.info('pull done');

					resolve();
				}
			});
		});
	} // }}}

	protected async push(): Promise<void> { // {{{
		Logger.info('push to remote');

		const rsync = new Rsync()
			.shell(this._shell)
			.flags('az')
			.source(path.join(this._rootPath, '*'))
			.destination(this._remoteUrl);

		return new Promise((resolve, reject) => {
			rsync.execute((error) => {
				if(error) {
					Logger.error(error);

					reject(error);
				}
				else {
					Logger.info('push done');

					resolve();
				}
			});
		});
	} // }}}
}
