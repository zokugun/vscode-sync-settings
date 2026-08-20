import type { Readable, Writable } from 'stream';

import rewiremock from 'rewiremock';

import { fs } from '../mocks/fs.js';

rewiremock('fs').with(fs);

rewiremock.enable();

import { type ReturnCallback, v2 as ws } from 'webdav-server';

rewiremock.disable();

class MemFileSystem extends ws.PhysicalFileSystem {
	protected _openReadStream(path: ws.Path, _ctx: ws.OpenReadStreamInfo, callback: ReturnCallback<Readable>): void {
		const { realPath } = this.getRealPath(path);

		const stream = fs.createReadStream(realPath);

		// @ts-expect-error no error, set to null
		callback(null, stream);
	}

	protected _openWriteStream(path: ws.Path, _ctx: ws.OpenWriteStreamInfo, callback: ReturnCallback<Writable>): void {
		const { realPath } = this.getRealPath(path);

		const stream = fs.createWriteStream(realPath);

		// @ts-expect-error no error, set to null
		callback(null, stream);
	}
}

export {
	MemFileSystem,
	ws,
};
