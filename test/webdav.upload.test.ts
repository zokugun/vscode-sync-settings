import { expect } from 'chai';
import { vol } from 'memfs';
import { context } from './mocks/context.js';
import * as vscode from './mocks/vscode.js';
import { RepositoryFactory, Settings } from './rewires/repository.js';
import { createWebDAVServer, type WebDAVServer } from './utils/create-webdav-server.js';
import { fixtures } from './utils/fixtures.js';

describe('webdav.upload', () => {
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
		const repository = await RepositoryFactory.get();

		await repository.upload();

		expect(vscode.outputLines.pop()).to.eql('[info] push done');

		expect(vol.readFileSync('/webdav/profiles/main/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
			disabled: [],
			enabled: [],
		}));
	}); // }}}

	it('extensions', async () => { // {{{
		vscode.setExtensions({
			disabled: ['pub1.ext3', 'pub3.ext1'],
			enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
		});

		const repository = await RepositoryFactory.get();

		await repository.upload();

		expect(vscode.outputLines.pop()).to.eql('[info] push done');

		expect(vol.readFileSync('/webdav/profiles/main/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
			disabled: ['pub1.ext3', 'pub3.ext1'],
			enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
		}));
	}); // }}}

	it('temp', async () => { // {{{
		vol.fromJSON({
			'/webdav/.vsx': 'zokugun.sync-settings',
			'/webdav/.profiles/main/extensions.yml': 'old upload',
		});

		const repository = await RepositoryFactory.get();

		await repository.upload();

		expect(vscode.outputLines.pop()).to.eql('[info] push done');

		expect(vol.readFileSync('/webdav/profiles/main/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
			disabled: [],
			enabled: [],
		}));
	}); // }}}
});
