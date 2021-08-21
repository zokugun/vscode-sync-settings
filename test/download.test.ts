import { expect } from 'chai';
import { vol } from 'memfs';
import yaml from 'yaml';
import { RepositoryFactory, Settings } from './rewires/repository';
import { context } from './mocks/context';
import { fixtures } from './utils/fixtures';
import * as vscode from './mocks/vscode';

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
			'/extension/settings.yml': settingsFxt.yml.default,
		});

		await RepositoryFactory.reset();
		await Settings.load(context);
	}); // }}}

	it('empty', async () => { // {{{
		vol.fromJSON({
			'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
			'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
		});

		const repository = await RepositoryFactory.get();

		await repository.download();

		expect(vscode.outputLines.pop()).to.eql('[info] restore done');
		expect(vscode.executedCommands.pop()).to.eql('workbench.action.reloadWindow');
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
			expect(vscode.executedCommands.pop()).to.eql('workbench.action.reloadWindow');
			expect(vscode.vscode.extensions.all.map(({ id }) => id)).to.eql(['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2']);
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
			expect(vscode.executedCommands.pop()).to.eql('workbench.action.reloadWindow');
			expect(vscode.vscode.extensions.all).to.be.empty;
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
			expect(vol.readFileSync('/user/settings.json', 'utf-8')).to.eql(userSettingsFxt.json.basics);
		}); // }}}

		it('attr', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.attr,
			});

			vscode.setPlatform('linux');

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');
			expect(vol.readFileSync('/user/settings.json', 'utf-8')).to.eql(userSettingsFxt.json.attrLinux);
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

			expect(vol.readFileSync('/user/keybindings.json', 'utf-8')).to.be.eql(keybindingsFxt.json.gotoline);
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

			expect(vol.readFileSync('/user/keybindings.json', 'utf-8')).to.be.eql(keybindingsFxt.json.gotoline);
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

		expect(vol.readFileSync('/user/snippets/loop.json', 'utf-8')).to.eql(snippetsFxt.json.loop);
	}); // }}}
});
