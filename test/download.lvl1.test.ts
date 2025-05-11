import { expect } from 'chai';
import { vol } from 'memfs';
import yaml from 'yaml';
import { context } from './mocks/context.js';
import * as vscode from './mocks/vscode.js';
import { RepositoryFactory, Settings } from './rewires/repository.js';
import { fixtures } from './utils/fixtures.js';

describe('download.lvl1', () => {
	const dotsyncFxt = fixtures('dotsync');
	const extensionsFxt = fixtures('extensions');
	const keybindingsFxt = fixtures('keybindings');
	const profilesFxt = fixtures('profiles');
	const settingsFxt = fixtures('settings');
	const userSettingsFxt = fixtures('user-settings');

	beforeEach(async () => { // {{{
		vol.reset();
		vscode.reset();

		vol.fromJSON({
			'/globalStorage/extension/settings.yml': settingsFxt.yml.level1,
			'/repository/profiles/level1/profile.yml': profilesFxt.yml.level1,
		});

		await RepositoryFactory.reset();
		await Settings.load(context);
	}); // }}}

	describe('dotsync', () => {
		it('none', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/data/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.basics,
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vol.readFileSync('/user/settings.json', 'utf8')).to.be.eql(userSettingsFxt.json.basics);
		}); // }}}
	});

	describe('extensions', () => {
		beforeEach(async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.empty,
				'/repository/profiles/level1/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/level1/data/settings.json': userSettingsFxt.json.empty,
			});
		}); // }}}

		it('none', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/data/extensions.yml': yaml.stringify({
					disabled: ['pub1.ext3', 'pub3.ext1'],
					enabled: ['pub1.ext1', 'pub1.ext2'],
				}),
				'/repository/profiles/level1/data/extensions.yml': yaml.stringify({
					disabled: [],
					enabled: ['pub2.ext1', 'pub2.ext2'],
				}),
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vscode.getExtensions()).to.eql({
				disabled: ['pub1.ext3', 'pub3.ext1'],
				enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
			});
		}); // }}}

		it('add', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/data/extensions.yml': yaml.stringify({
					disabled: ['pub1.ext3', 'pub3.ext1'],
					enabled: ['pub1.ext1', 'pub1.ext2'],
				}),
				'/repository/profiles/level1/data/extensions.yml': yaml.stringify({
					disabled: [],
					enabled: ['pub2.ext1', 'pub2.ext2'],
				}),
			});

			vscode.setExtensions({
				disabled: ['pub3.ext1'],
				enabled: ['pub1.ext1', 'pub2.ext1'],
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
				'/repository/profiles/main/data/extensions.yml': yaml.stringify({
					disabled: ['pub1.ext3', 'pub3.ext1'],
					enabled: ['pub1.ext1', 'pub1.ext2'],
				}),
				'/repository/profiles/level1/data/extensions.yml': yaml.stringify({
					disabled: [],
					enabled: ['pub2.ext1', 'pub2.ext2'],
				}),
			});

			vscode.setExtensions({
				disabled: ['pub5.ext1'],
				enabled: ['pub4.ext1'],
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vscode.getExtensions()).to.eql({
				disabled: ['pub1.ext3', 'pub3.ext1'],
				enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
			});
		}); // }}}
	});

	describe('keybindings', () => {
		it('nopatch', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/data/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/keybindings.json': keybindingsFxt.json.gotoline,
				'/repository/profiles/level1/.sync.yml': dotsyncFxt.yml.empty,
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vol.readFileSync('/user/keybindings.json', 'utf8')).to.be.eql(keybindingsFxt.json.gotoline);
		}); // }}}
	});

	describe('settings', () => {
		it('nopatch', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/data/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.basics,
				'/repository/profiles/level1/.sync.yml': dotsyncFxt.yml.empty,
			});

			const repository = await RepositoryFactory.get();

			await repository.download();

			expect(vscode.outputLines.pop()).to.eql('[info] restore done');

			expect(vol.readFileSync('/user/settings.json', 'utf8')).to.be.eql(userSettingsFxt.json.basics);
		}); // }}}
	});
});
