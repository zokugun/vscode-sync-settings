import os from 'os';
import path from 'path';
import rewiremock from 'rewiremock';
import { fs } from '../mocks/fs.js';
import { process, vscode } from '../mocks/vscode.js';

rewiremock('fs').with(fs);
rewiremock(path.join('fs', 'promises')).with(fs.promises);
rewiremock('vscode').with(vscode);
rewiremock('process').with(process);

rewiremock(path.join('.', 'get-editor-storage.js')).with({
	getEditorStorage: async () => '/.vscode',
});

rewiremock(path.join('..', 'utils', 'get-extension-data-uri.js')).with({
	getExtensionDataUri: async () => '/.vscode/extensions',
});

rewiremock(path.join('..', 'utils', 'get-user-data-path.js')).with({
	getUserDataPath: () => '/user',
});

rewiremock('os').with({
	...os,
	homedir: () => '/home',
});

rewiremock.enable();

/* eslint-disable import/first, import/order */
import { Settings } from '../../src/settings.js';
import { RepositoryFactory } from '../../src/repository-factory.js';
/* eslint-enable import/first, import/order */

rewiremock.disable();

/* eslint-disable unicorn/prefer-export-from */
export {
	RepositoryFactory,
	Settings,
};
/* eslint-enable unicorn/prefer-export-from */
