import { promisify } from 'util';
import { fs as mfs } from 'memfs';
import { fromCallback as u } from 'universalify';

const fs = {
	access: u(mfs.access),
	copyFile: u(mfs.copyFile),
	lstat: u(mfs.lstat),
	mkdir: u(mfs.mkdir),
	read: u(mfs.read),
	readdir: u(mfs.readdir),
	readFile: u(mfs.readFile),
	realpath: u(mfs.realpath),
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
		stat: mfs.promises.stat,
		Stats: mfs.Stats,
		unlink: mfs.promises.unlink,
		writeFile: mfs.promises.writeFile,
	},
};

// @ts-expect-error
fs.realpath.native = mfs.realpath;

export {
	fs,
};
