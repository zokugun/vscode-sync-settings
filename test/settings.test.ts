import { expect } from 'chai';
import { vol } from 'memfs';
import { Settings } from './rewires/settings';
import { context } from './mocks/context';
import { fixtures } from './utils/fixtures';
import * as vscode from './mocks/vscode';

describe('settings', () => {
	const settingsFxt = fixtures('settings');

	beforeEach(() => { // {{{
		vol.reset();
		vscode.reset();
	}); // }}}

	it('get', async () => { // {{{
		vol.fromJSON({
			'/extension/settings.yml': settingsFxt.yml.default,
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
