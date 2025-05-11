import { promisify } from 'util';
import { fs as mfs } from 'memfs';
import { fromCallback as u } from 'universalify';

const fs = {
	access: u(mfs.access),
	chmod: u(mfs.chmod),
	close: u(mfs.close),
	copyFile: u(mfs.copyFile),
	createReadStream: mfs.createReadStream,
	createWriteStream: mfs.createWriteStream,
	existsSync: mfs.existsSync,
	futimes: u(mfs.futimes),
	lstat: u(mfs.lstat),
	mkdir: u(mfs.mkdir),
	open: u(mfs.open),
	read: u(mfs.read),
	readdir: u(mfs.readdir),
	readFile: u(mfs.readFile),
	realpath: u(mfs.realpath),
	rm: u(mfs.rm),
	rmdir: u(mfs.rmdir),
	rename: u(mfs.rename),
	stat: u(mfs.stat),
	Stats: mfs.Stats,
	unlink: u(mfs.unlink),
	writeFile: u(mfs.writeFile),

	promises: {
		access: mfs.promises.access,
		copyFile: mfs.promises.copyFile,
		lstat: mfs.promises.lstat,
		mkdir: mfs.promises.mkdir,
		read: promisify(mfs.read),
		readdir: mfs.promises.readdir,
		readFile: mfs.promises.readFile,
		realpath: mfs.promises.realpath,
		rm: mfs.promises.rm,
		rmdir: mfs.promises.rmdir,
		rename: mfs.promises.rename,
		stat: mfs.promises.stat,
		Stats: mfs.Stats,
		unlink: mfs.promises.unlink,
		writeFile: mfs.promises.writeFile,
	},
};

// @ts-expect-error set implementation to memfs
fs.realpath.native = mfs.realpath;

export {
	fs,
};
