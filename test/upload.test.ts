import { expect } from 'chai';
import { vol } from 'memfs';
import yaml from 'yaml';
import { RepositoryFactory, Settings } from './rewires/repository';
import { context } from './mocks/context';
import { fixtures } from './utils/fixtures';
import * as vscode from './mocks/vscode';

describe('upload', () => {
	const dotsyncFxt = fixtures('dotsync');
	const keybindingsFxt = fixtures('keybindings');
	const profilesFxt = fixtures('profiles');
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
		const repository = await RepositoryFactory.get();

		await repository.upload();

		expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

		expect(vol.readFileSync('/repository/profiles/main/extensions.yml', 'utf-8')).to.eql(yaml.stringify({
			disabled: [],
			enabled: [],
		}));
		expect(vol.readFileSync('/repository/profiles/main/.sync.yml', 'utf-8')).to.eql(dotsyncFxt.yml.empty);
	}); // }}}

	it('extensions', async () => { // {{{
		vscode.setExtensions({
			disabled: ['pub1.ext3', 'pub3.ext1'],
			enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
		});

		const repository = await RepositoryFactory.get();

		await repository.upload();

		expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

		expect(vol.readFileSync('/repository/profiles/main/extensions.yml', 'utf-8')).to.eql(yaml.stringify({
			disabled: ['pub1.ext3', 'pub3.ext1'],
			enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
		}));
		expect(vol.readFileSync('/repository/profiles/main/.sync.yml', 'utf-8')).to.eql(dotsyncFxt.yml.empty);
	}); // }}}

	describe('settings', () => {
		it('base', async () => { // {{{
			vscode.setSettings(userSettingsFxt.json.basics);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/data/settings.json', 'utf-8')).to.eql(userSettingsFxt.json.basics);
		}); // }}}

		it('attr', async () => { // {{{
			vscode.setPlatform('linux');
			vscode.setSettings(userSettingsFxt.json.attr);

			expect(vol.readFileSync('/user/settings.json', 'utf-8')).to.eql(userSettingsFxt.json.attrLinux);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/data/settings.json', 'utf-8')).to.eql(userSettingsFxt.json.attr);
		}); // }}}
	});

	describe('keybindings', () => {
		it('all', async () => { // {{{
			vscode.setSettings({
				'syncSettings.keybindingsPerPlatform': false,
			});
			vscode.setKeybindings(keybindingsFxt.json.gotoline);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/data/keybindings.json', 'utf-8')).to.eql(keybindingsFxt.json.gotoline);
		}); // }}}

		it('linux', async () => { // {{{
			vscode.setKeybindings(keybindingsFxt.json.gotoline);
			vscode.setPlatform('linux');

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/data/keybindings-linux.json', 'utf-8')).to.eql(keybindingsFxt.json.gotoline);
		}); // }}}

		it('macos', async () => { // {{{
			vscode.setKeybindings(keybindingsFxt.json.gotoline);
			vscode.setPlatform('darwin');

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/data/keybindings-macos.json', 'utf-8')).to.eql(keybindingsFxt.json.gotoline);
		}); // }}}

		it('windows', async () => { // {{{
			vscode.setKeybindings(keybindingsFxt.json.gotoline);
			vscode.setPlatform('win32');

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/data/keybindings-windows.json', 'utf-8')).to.eql(keybindingsFxt.json.gotoline);
		}); // }}}
	});

	it('snippets', async () => { // {{{
		vscode.addSnippet('loop', snippetsFxt.json.loop);

		const repository = await RepositoryFactory.get();

		await repository.upload();

		expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

		expect(vol.readFileSync('/repository/profiles/main/data/snippets/loop.json', 'utf-8')).to.eql(snippetsFxt.json.loop);
	}); // }}}

	describe('profile', () => {
		it('empty', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/profile.yml': profilesFxt.yml.empty,
			});

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/extensions.yml', 'utf-8')).to.eql(yaml.stringify({
				disabled: [],
				enabled: [],
			}));
			expect(vol.readFileSync('/repository/profiles/main/.sync.yml', 'utf-8')).to.eql(dotsyncFxt.yml.empty);
		}); // }}}
	});
});
