import { expect } from 'chai';
import { vol } from 'memfs';
import { context } from './mocks/context';
import * as vscode from './mocks/vscode';
import { Settings } from './rewires/settings';
import { fixtures } from './utils/fixtures';

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
