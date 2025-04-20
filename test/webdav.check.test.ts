import { expect } from 'chai';
import { type DirectoryJSON, vol } from 'memfs';
import { context } from './mocks/context.js';
import * as vscode from './mocks/vscode.js';
import { RepositoryFactory, Settings } from './rewires/repository.js';
import { createWebDAVServer, type WebDAVServer } from './utils/create-webdav-server.js';
import { fixtures } from './utils/fixtures.js';

async function reset(json: DirectoryJSON) { // {{{
	vol.reset();
	vscode.reset();

	vol.fromJSON(json);

	await RepositoryFactory.reset();
	await Settings.load(context);
} // }}}

describe('webdav.check', () => {
	const extensionsFxt = fixtures('extensions');
	const settingsFxt = fixtures('settings');

	let server: WebDAVServer;

	before(async () => {
		server = createWebDAVServer();

		return server.start();
	});

	after(async () => server.stop());

	it('empty', async () => { // {{{
		await reset({
			'/globalStorage/extension/settings.yml': settingsFxt.yml.webdav,
			'/webdav': null,
		});

		await RepositoryFactory.get();

		expect(vscode.outputLines.pop()).to.eql('[info] The working directory is empty. Continue.');
		expect(vscode.outputLines.pop()).to.eql('[info] The connection to WebDAV is successful.');
	}); // }}}

	it('valid', async () => { // {{{
		await reset({
			'/globalStorage/extension/settings.yml': settingsFxt.yml.webdav,
			'/webdav/.vsx': 'zokugun.sync-settings',
		});

		await RepositoryFactory.get();

		expect(vscode.outputLines.pop()).to.eql('[info] The working directory is valid. Continue.');
		expect(vscode.outputLines.pop()).to.eql('[info] The connection to WebDAV is successful.');
	}); // }}}

	it('unvalid', async () => { // {{{
		await reset({
			'/globalStorage/extension/settings.yml': settingsFxt.yml.webdav,
			'/webdav/extensions.yml': extensionsFxt.yml.empty,
		});

		await RepositoryFactory.get();

		expect(vscode.outputLines.pop()).to.eql('[error] The working directory is not valid. Please use an empty directory.');
		expect(vscode.outputLines.pop()).to.eql('[info] The connection to WebDAV is successful.');
	}); // }}}
});
