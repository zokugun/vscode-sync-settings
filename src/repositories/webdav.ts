/* eslint-disable max-classes-per-file */

import type { BufferLike } from 'webdav';
import type { Settings } from '../settings.js';

import fs from 'fs/promises';
import http from 'http';
import https from 'https';
import path from 'path';
import process from 'process';
import fse from 'fs-extra';
import globby from 'globby';
import { fromCallback as u } from 'universalify';
import { Uri } from 'vscode';
import { createAdapter, type FsStat, type PathLike } from 'webdav-fs';

import { FileRepository } from './file.js';
import { RepositoryType } from '../repository-type.js';
import { Logger } from '../utils/logger.js';
import { safeCast } from '../utils/safe-cast.js';
import { TemporaryRepository } from '../utils/temporary-repository.js';
import { unsafeCast } from '../utils/unsafe-cast.js';

type WebDAVFS = {
	mkdir: (dirPath: PathLike) => Promise<void>;
	readdir: (dirPath: PathLike, modeOrCallback?: 'node' | 'stat') => Promise<Array<FsStat | string>>;
	readFile: (filename: PathLike, encodingOrCallback?: 'binary' | 'text' | 'utf8') => Promise<BufferLike | string>;
	rename: (filePath: PathLike, targetPath: PathLike) => Promise<void>;
	rmdir: (targetPath: PathLike) => Promise<void>;
	stat: (remotePath: PathLike) => Promise<FsStat>;
	writeFile: (filename: PathLike, data: BufferLike | string, encodingOrCallback?: 'binary' | 'text' | 'utf8') => Promise<void>;
};

class WebDAVError extends Error {
}

export class WebDAVRepository extends FileRepository {
	protected _fs?: WebDAVFS;
	protected _ignoreTLSErrors: boolean;
	protected _options: Record<string, unknown>;
	protected _url: string;

	public constructor(settings: Settings) { // {{{
		super(settings, TemporaryRepository.getPath(settings));

		// @ts-expect-error ignoreTLSErrors can be an option
		const { ignoreTLSErrors, url, ...options } = settings.repository;

		this._url = url!;
		this._options = options;
		this._ignoreTLSErrors = ignoreTLSErrors === true || false;
	} // }}}

	public override get type(): RepositoryType { // {{{
		return RepositoryType.WEBDAV;
	} // }}}

	public override async download(): Promise<boolean> { // {{{
		this.checkInitialized();

		try {
			this.configureTLS();

			await this.pull();
		}
		finally {
			this.restoreTLS();
		}

		return super.download();
	} // }}}

	public override async initialize(): Promise<void> { // {{{
		await TemporaryRepository.initialize(this._settings, this.type, this._url, JSON.stringify(this._options));

		const { agent, ...options } = this._options;

		if(agent) {
			const { scheme } = Uri.parse(this._url);

			if(scheme === 'https') {
				options.httpsAgent = new https.Agent(unsafeCast<https.AgentOptions>(agent));
			}
			else if(scheme === 'http') {
				options.httpAgent = new http.Agent(unsafeCast<https.AgentOptions>(agent));
			}
		}

		const fs = createAdapter(this._url, options);

		this._fs = {
			mkdir: safeCast<WebDAVFS['mkdir']>(u(fs.mkdir)),
			readdir: safeCast<WebDAVFS['readdir']>(u(fs.readdir)),
			readFile: safeCast<WebDAVFS['readFile']>(u(fs.readFile)),
			rename: safeCast<WebDAVFS['rename']>(u(fs.rename)),
			rmdir: safeCast<WebDAVFS['rmdir']>(u(fs.rmdir)),
			stat: safeCast<WebDAVFS['stat']>(u(fs.stat)),
			writeFile: safeCast<WebDAVFS['writeFile']>(u(fs.writeFile)),
		};

		try {
			this.configureTLS();

			await this._fs.stat('/');

			Logger.info('The connection to WebDAV is successful.');

			await this.validate();
		}
		catch(error: unknown) {
			// @ts-expect-error checking error code
			if(error?.code === 'ECONNREFUSED') {
				Logger.error(`The connection to "${this._url}" is refused.`);
			}
			// @ts-expect-error checking error status
			else if(error?.status === 401) {
				Logger.error(`The connection to "${this._url}" isn't authorized.`);
			}
			// @ts-expect-error checking error status
			else if(error?.status === 404) {
				Logger.error(`The url "${this._url}" can't be found.`);
			}
			else if(error instanceof WebDAVError) {
				Logger.error(error.message);
			}
			else {
				Logger.error(String(error));
			}

			return;
		}
		finally {
			this.restoreTLS();
		}

		await super.initialize();
	} // }}}

	public override async pull(): Promise<boolean> { // {{{
		Logger.info('pull from webdav');

		await fse.remove(this._rootPath);
		await fse.mkdir(this._rootPath);

		const files: FsStat[] = safeCast<FsStat[]>(await this._fs!.readdir('/', 'stat'));
		for(const file of files) {
			if(file.isDirectory()) {
				await this.pullDirectory(path.join(this._rootPath, file.name), Uri.file(file.name));
			}
			else {
				await this.pullFile(path.join(this._rootPath, file.name), Uri.file(file.name));
			}
		}

		Logger.info('pull done');

		return true;
	} // }}}

	public override async terminate(): Promise<void> { // {{{
		await TemporaryRepository.terminate(this._settings);
	} // }}}

	public override async upload(): Promise<boolean> { // {{{
		this.checkInitialized();

		await super.upload();

		try {
			this.configureTLS();

			await this.push();
		}
		finally {
			this.restoreTLS();
		}

		return true;
	} // }}}

	protected configureTLS(): void { // {{{
		if(this._ignoreTLSErrors) {
			// @ts-expect-error NODE_TLS_REJECT_UNAUTHORIZED is accepting 0 or 1
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
		}
	} // }}}

	protected async emptyDir(dir: Uri): Promise<void> { // {{{
		try {
			await this._fs!.stat(dir.path);

			await this._fs!.rmdir(dir.path);
		}
		catch {
		}

		await this._fs!.mkdir(dir.path);
	} // }}}

	protected async ensureDir(dir: Uri, exists: Record<string, boolean>): Promise<void> { // {{{
		if(exists[dir.path]) {
			return;
		}

		if(dir.path !== '/') {
			await this.ensureDir(Uri.joinPath(dir, '..'), exists);
		}

		try {
			await this._fs!.stat(dir.path);
		}
		catch {
			await this._fs!.mkdir(dir.path);
		}

		exists[dir.path] = true;
	} // }}}

	protected async moveDir(sourceDir: Uri, destinationDir: Uri): Promise<void> { // {{{
		try {
			await this._fs!.stat(destinationDir.path);

			await this._fs!.rmdir(destinationDir.path);
		}
		catch {
		}

		Logger.info(`move "${sourceDir.path}" to "${destinationDir.path}"`);

		await this._fs!.rename(sourceDir.path, destinationDir.path);
	} // }}}

	protected async pullDirectory(localDir: string, remoteDir: Uri): Promise<void> { // {{{
		await fse.mkdir(localDir);

		const files: FsStat[] = safeCast<FsStat[]>(await this._fs!.readdir(remoteDir.path, 'stat'));
		for(const file of files) {
			if(file.isDirectory()) {
				await this.pullDirectory(path.join(localDir, file.name), Uri.joinPath(remoteDir, file.name));
			}
			else {
				await this.pullFile(path.join(localDir, file.name), Uri.joinPath(remoteDir, file.name));
			}
		}
	} // }}}

	protected async pullFile(localFile: string, remoteFile: Uri): Promise<void> { // {{{
		const data = safeCast<string>(await this._fs!.readFile(remoteFile.path, 'utf8'));

		await fs.writeFile(localFile, data, 'utf8');
	} // }}}

	protected async push(): Promise<void> { // {{{
		Logger.info('push to webdav');

		const files = await globby('**', {
			cwd: path.join(this._rootPath, 'profiles'),
			dot: true, // Include dot files like .sync.yml
			followSymbolicLinks: false,
		});

		const temporaryRoot = Uri.parse('/.profiles');

		await this.emptyDir(temporaryRoot);

		const exists = {};

		for(const file of files) {
			await this.pushFile(path.join(this._rootPath, 'profiles', file), Uri.joinPath(temporaryRoot, file), exists);
		}

		await this.moveDir(temporaryRoot, Uri.parse('/profiles'));

		Logger.info('push done');
	} // }}}

	protected async pushFile(localFile: string, remoteFile: Uri, exists: Record<string, boolean>): Promise<void> { // {{{
		Logger.info(`push file: ${remoteFile.path}`);

		await this.ensureDir(Uri.joinPath(remoteFile, '..'), exists);

		const data = await fs.readFile(localFile, 'utf8');

		await this._fs!.writeFile(remoteFile.path, data, 'utf8');
	} // }}}

	protected restoreTLS(): void { // {{{
		if(this._ignoreTLSErrors) {
			// @ts-expect-error NODE_TLS_REJECT_UNAUTHORIZED is accepting 0 or 1
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = 1;
		}
	} // }}}

	protected async validate(): Promise<void> { // {{{
		const files: string[] = safeCast<string[]>(await this._fs!.readdir('/'));
		if(files.length === 0) {
			await this._fs!.writeFile('/.vsx', 'zokugun.sync-settings', 'utf8');

			Logger.info('The working directory is empty. Continue.');

			return;
		}
		else if(files.includes('.vsx')) {
			const data = safeCast<string>(await this._fs!.readFile('/.vsx', 'utf8'));

			if(data === 'zokugun.sync-settings') {
				Logger.info('The working directory is valid. Continue.');

				return;
			}
		}

		throw new WebDAVError('The working directory is not valid. Please use an empty directory.');
	} // }}}
}
