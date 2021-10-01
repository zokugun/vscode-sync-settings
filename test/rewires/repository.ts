import rewiremock from 'rewiremock';
import { fs } from '../mocks/fs';
import { process, vscode } from '../mocks/vscode';

rewiremock('fs').with(fs);
rewiremock('fs/promises').with(fs.promises);
rewiremock('vscode').with(vscode);
rewiremock('process').with(process);

rewiremock('utils/get-extension-data-path').with({
	getExtensionDataPath: async () => '/.vscode/extensions',
});

rewiremock('../utils/get-extension-data-uri').with({
	getExtensionDataUri: async () => '/.vscode/extensions',
});

rewiremock('../utils/get-user-data-path').with({
	getUserDataPath: () => '/user',
});

rewiremock.enable();

/* eslint-disable import/first, import/order */
import { Settings } from '../../src/settings';
import { RepositoryFactory } from '../../src/repository-factory';
/* eslint-enable import/first, import/order */

rewiremock.disable();

export {
	RepositoryFactory,
	Settings,
};
