import { expect } from 'chai';
import { vol } from 'memfs';
import yaml from 'yaml';
import { context } from './mocks/context.js';
import * as vscode from './mocks/vscode.js';
import { RepositoryFactory, Settings } from './rewires/repository.js';
import { fixtures } from './utils/fixtures.js';

describe('download', () => {
	const dotsyncFxt = fixtures('dotsync');
	const extensionsFxt = fixtures('extensions');
	const keybindingsFxt = fixtures('keybindings');
	const settingsFxt = fixtures('settings');
	const snippetsFxt = fixtures('snippets');
	const userSettingsFxt = fixtures('user-settings');

	beforeEach(async () => { // {{{
		vol.reset();
		vscode.reset();

		vol.fromJSON({
			'/globalStorage/extension/settings.yml': settingsFxt.yml.default,
		});

		await RepositoryFactory.reset();
		await Settings.load(context);
	}); // }}}

	it('empty', async () => { // {{{
		vol.fromJSON({
			'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
			'/repository/profiles/main/data/extensions.yml': extensionsFxt.yml.empty,
		});

		const repository = await RepositoryFactory.get();

		await repository.download();

		expect(vscode.outputLines.pop()).to.eql('[info] restore done');
		expect(vscode.executedCommands.pop()).to.eql(undefined);
	}); // }}}

	it('nodotsync', async () => { // {{{
		vol.fromJSON({
			'/repository/profiles/main/data/extensions.yml': extensionsFxt.yml.empty,
		});

		const repository = await RepositoryFactory.get();

		await repository.download();

		expect(vscode.outputLines.pop()).to.eql('[info] restore done');
		expect(vscode.executedCommands.pop()).to.eql(undefined);
	}); // }}}

	describe('extensions', () => {
		it('add', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': yaml.stringify({
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
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
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

		it('leftovers', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
			});

			vscode.setExtensions({
				disabled: ['pub3.ext1'],
				enabled: ['pub1.ext1'],
			});

			vol.mkdirSync('/.vscode/extensions/leftover-0.0.0');
			vol.mkdirSync('/.vscode/extensions/leftover-0.1.0');
			vol.mkdirSync('/.vscode/extensions/leftover-0.2.0');

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vscode.getExtensions()).to.eql({
				disabled: [],
				enabled: [],
			});
		}); // }}}
	});

	describe('settings', () => {
		it('base', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.basics,
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');
			expect(vol.readFileSync('/user/settings.json', 'utf8')).to.eql(userSettingsFxt.json.basics);
		}); // }}}

		it('attr.os', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.attrOsTmpl,
			});

			vscode.setPlatform('linux');

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');
			expect(vol.readFileSync('/user/settings.json', 'utf8')).to.eql(userSettingsFxt.json.attrOsLinux);
		}); // }}}

		it('attr.editor', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.attrEditorTmpl,
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');
			expect(vol.readFileSync('/user/settings.json', 'utf8')).to.eql(userSettingsFxt.json.attrEditorRes);
		}); // }}}
	});

	describe('keybindings', () => {
		it('all', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/keybindings.json': keybindingsFxt.json.gotoline,
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vol.readFileSync('/user/keybindings.json', 'utf8')).to.be.eql(keybindingsFxt.json.gotoline);
		}); // }}}

		it('linux', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/keybindings-linux.json': keybindingsFxt.json.gotoline,
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vol.readFileSync('/user/keybindings.json', 'utf8')).to.be.eql(keybindingsFxt.json.gotoline);
		}); // }}}
	});

	it('snippets', async () => { // {{{
		vol.fromJSON({
			'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
			'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
			'/repository/profiles/main/data/snippets/loop.json': snippetsFxt.json.loop,
		});

		const repository = await RepositoryFactory.get();

		await repository.download();

		expect(vscode.outputLines.pop()).to.eql('[info] restore done');

		expect(vol.readFileSync('/user/snippets/loop.json', 'utf8')).to.eql(snippetsFxt.json.loop);
	}); // }}}

	it('additionals', async () => { // {{{
		vol.fromJSON({
			'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.additionals,
			'/repository/profiles/main/data/additionals/~globalStorage-alefragnani.project-manager-projects.json': keybindingsFxt.json.gotoline,
			'/repository/profiles/main/data/additionals/~-projects.json': keybindingsFxt.json.gotoline,
		});

		const repository = await RepositoryFactory.get();

		await repository.download();

		expect(vscode.outputLines.pop()).to.eql('[info] restore done');

		expect(vol.readFileSync('/globalStorage/alefragnani.project-manager/projects.json', 'utf8')).to.eql(keybindingsFxt.json.gotoline);
		expect(vol.readFileSync('/home/projects.json', 'utf8')).to.eql(keybindingsFxt.json.gotoline);
	}); // }}}
});
