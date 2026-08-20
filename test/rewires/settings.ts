import rewiremock from 'rewiremock';

import { fs } from '../mocks/fs.js';
import { vscode } from '../mocks/vscode.js';

rewiremock('fs').with(fs);
rewiremock('fs/promises').with(fs.promises);
rewiremock('vscode').with(vscode);

rewiremock.enable();

import { Settings } from '../../src/settings.js';

rewiremock.disable();

export {
	Settings,
};
