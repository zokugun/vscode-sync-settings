import { type Readable, type Writable } from 'stream';
import rewiremock from 'rewiremock';
import { fs } from '../mocks/fs.js';

rewiremock('fs').with(fs);

rewiremock.enable();

/* eslint-disable import/first, import/order */
import { type ReturnCallback, v2 as ws } from 'webdav-server';
/* eslint-enable import/first, import/order */

rewiremock.disable();

class MemFileSystem extends ws.PhysicalFileSystem {
	protected _openReadStream(path: ws.Path, _: ws.OpenReadStreamInfo, callback: ReturnCallback<Readable>): void {
		const { realPath } = this.getRealPath(path);

		const stream = fs.createReadStream(realPath);

		// @ts-expect-error no error, set to null
		callback(null, stream);
	}

	protected _openWriteStream(path: ws.Path, _: ws.OpenWriteStreamInfo, callback: ReturnCallback<Writable>): void {
		const { realPath } = this.getRealPath(path);

		const stream = fs.createWriteStream(realPath);

		// @ts-expect-error no error, set to null
		callback(null, stream);
	}
}

/* eslint-disable unicorn/prefer-export-from */
export {
	ws,
	MemFileSystem,
};
/* eslint-enable unicorn/prefer-export-from */
