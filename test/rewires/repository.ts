import os from 'os';
import path from 'path';
import rewiremock from 'rewiremock';
import { fs } from '../mocks/fs';
import { process, vscode } from '../mocks/vscode';

rewiremock('fs').with(fs);
rewiremock(path.join('fs', 'promises')).with(fs.promises);
rewiremock('vscode').with(vscode);
rewiremock('process').with(process);

rewiremock(path.join('utils', 'get-extension-data-path')).with({
	getExtensionDataPath: async () => '/.vscode/extensions',
});

rewiremock(path.join('..', 'utils', 'get-extension-data-uri')).with({
	getExtensionDataUri: async () => '/.vscode/extensions',
});

rewiremock(path.join('..', 'utils', 'get-user-data-path')).with({
	getUserDataPath: () => '/user',
});

rewiremock('os').with({
	...os,
	homedir: () => '/home',
});

rewiremock.enable();

/* eslint-disable import/first, import/order */
import { Settings } from '../../src/settings';
import { RepositoryFactory } from '../../src/repository-factory';
/* eslint-enable import/first, import/order */

rewiremock.disable();

/* eslint-disable unicorn/prefer-export-from */
export {
	RepositoryFactory,
	Settings,
};
/* eslint-enable unicorn/prefer-export-from */
