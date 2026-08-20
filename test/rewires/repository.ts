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

import { Settings } from '../../src/settings.js';
import { Logger } from '../../src/utils/logger.js';
import { RepositoryFactory } from '../../src/repository-factory.js';

rewiremock.disable();

export {
	Logger,
	RepositoryFactory,
	Settings,
};
