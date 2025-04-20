import { expect } from 'chai';
import { vol } from 'memfs';
import { context } from './mocks/context.js';
import * as vscode from './mocks/vscode.js';
import { Settings } from './rewires/settings.js';
import { fixtures } from './utils/fixtures.js';

describe('settings', () => {
	const settingsFxt = fixtures('settings');

	beforeEach(() => { // {{{
		vol.reset();
		vscode.reset();
	}); // }}}

	it('get', async () => { // {{{
		vol.fromJSON({
			'/globalStorage/extension/settings.yml': settingsFxt.yml.default,
		});

		await Settings.load(context);

		const settings = Settings.get();

		expect(settings.profile).to.eql('main');
		expect(settings.repository).to.eql({
			type: 'file',
			path: '/repository',
		});
	}); // }}}
});
