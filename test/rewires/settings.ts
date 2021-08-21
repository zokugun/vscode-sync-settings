import rewiremock from 'rewiremock';
import { fs } from '../mocks/fs';
import { vscode } from '../mocks/vscode';

rewiremock('fs').with(fs);
rewiremock('fs/promises').with(fs.promises);
rewiremock('vscode').with(vscode);

rewiremock.enable();

// eslint-disable-next-line import/first
import { Settings } from '../../src/settings';

rewiremock.disable();

export {
	Settings,
};
