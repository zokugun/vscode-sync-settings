import { expect } from 'chai';
import { vol } from 'memfs';
import yaml from 'yaml';
import { context } from './mocks/context.js';
import * as vscode from './mocks/vscode.js';
import { RepositoryFactory, Settings } from './rewires/repository.js';
import { createWebDAVServer, type WebDAVServer } from './utils/create-webdav-server.js';
import { fixtures } from './utils/fixtures.js';

describe('webdav.download', () => {
	const dotsyncFxt = fixtures('dotsync');
	const extensionsFxt = fixtures('extensions');
	const settingsFxt = fixtures('settings');

	let server: WebDAVServer;

	before(async () => {
		server = createWebDAVServer();

		return server.start();
	});

	after(async () => server.stop());

	beforeEach(async () => { // {{{
		vol.reset();
		vscode.reset();

		vol.fromJSON({
			'/globalStorage/extension/settings.yml': settingsFxt.yml.webdav,
			'/webdav': null,
		});

		await RepositoryFactory.reset();
		await Settings.load(context);
	}); // }}}

	it('empty', async () => { // {{{
		vol.fromJSON({
			'/webdav/.vsx': 'zokugun.sync-settings',
			'/webdav/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
			'/webdav/profiles/main/data/extensions.yml': extensionsFxt.yml.empty,
		});

		const repository = await RepositoryFactory.get();

		await repository.download();

		expect(vscode.outputLines.pop()).to.eql('[info] restore done');
		expect(vscode.executedCommands.pop()).to.eql(undefined);
	}); // }}}

	describe('extensions', () => {
		it('add', async () => { // {{{
			vol.fromJSON({
				'/webdav/.vsx': 'zokugun.sync-settings',
				'/webdav/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/webdav/profiles/main/extensions.yml': yaml.stringify({
					disabled: ['pub1.ext3', 'pub3.ext1'],
					enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
				}),
			});

			vscode.setExtensions({
				disabled: ['pub3.ext1'],
				enabled: ['pub1.ext1'],
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vscode.getExtensions()).to.eql({
				disabled: ['pub1.ext3', 'pub3.ext1'],
				enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
			});
		}); // }}}

		it('remove', async () => { // {{{
			vol.fromJSON({
				'/webdav/.vsx': 'zokugun.sync-settings',
				'/webdav/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/webdav/profiles/main/extensions.yml': extensionsFxt.yml.empty,
			});

			vscode.setExtensions({
				disabled: ['pub3.ext1'],
				enabled: ['pub1.ext1'],
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vscode.getExtensions()).to.eql({
				disabled: [],
				enabled: [],
			});
		}); // }}}
	});
});
