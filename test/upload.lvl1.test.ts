import { expect } from 'chai';
import { vol } from 'memfs';
// import yaml from 'yaml';
import { context } from './mocks/context.js';
import * as vscode from './mocks/vscode.js';
import { RepositoryFactory, Settings } from './rewires/repository.js';
import { fixtures } from './utils/fixtures.js';

describe('upload.lvl1', () => {
	const dotsyncFxt = fixtures('dotsync');
	const extensionsFxt = fixtures('extensions');
	const keybindingsFxt = fixtures('keybindings');
	const profilesFxt = fixtures('profiles');
	const settingsFxt = fixtures('settings');
	const snippetsFxt = fixtures('snippets');
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
		it('empty', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.empty,
			});

			vscode.setSettings(userSettingsFxt.json.empty);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/.sync.yml')).to.be.false;
		}); // }}}

		it('notrequired', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.empty,
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/.sync.yml')).to.be.false;
		}); // }}}

		it('required', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.empty,
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/.sync.yml', 'utf8')).to.eql(dotsyncFxt.yml.keybindings);
		}); // }}}

		it('ignoredSettings', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.ignoredSettings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.empty,
			});

			vscode.setSettings(userSettingsFxt.json.ignoredSettings);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/.sync.yml')).to.be.false;
		}); // }}}
	});

	describe('extensions', () => {
		beforeEach(() => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.empty,
			});
		}); // }}}

		describe('managed', () => {
			it('add.enabled', async () => { // {{{
				vol.fromJSON({
					'/repository/profiles/main/data/extensions.yml': vscode.ext2yml({
						disabled: ['pub1.ext3', 'pub3.ext1'],
						enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
					}),
				});

				vscode.setExtensions({
					disabled: ['pub1.ext3', 'pub3.ext1'],
					enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2', 'pub3.ext2'],
				});

				const repository = await RepositoryFactory.get();

				await repository.upload();

				expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

				expect(vol.readFileSync('/repository/profiles/level1/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
					disabled: [],
					enabled: ['pub3.ext2'],
				}));
			}); // }}}

			it('add.disabled', async () => { // {{{
				vol.fromJSON({
					'/repository/profiles/main/data/extensions.yml': vscode.ext2yml({
						disabled: ['pub1.ext3', 'pub3.ext1'],
						enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
					}),
				});

				vscode.setExtensions({
					disabled: ['pub1.ext3', 'pub3.ext1', 'pub3.ext2'],
					enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
				});

				const repository = await RepositoryFactory.get();

				await repository.upload();

				expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

				expect(vol.readFileSync('/repository/profiles/level1/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
					disabled: ['pub3.ext2'],
					enabled: [],
				}));
			}); // }}}

			it('become.enabled', async () => { // {{{
				vol.fromJSON({
					'/repository/profiles/main/data/extensions.yml': vscode.ext2yml({
						disabled: ['pub1.ext3', 'pub3.ext1'],
						enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
					}),
				});

				vscode.setExtensions({
					disabled: ['pub1.ext3'],
					enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2', 'pub3.ext1'],
				});

				const repository = await RepositoryFactory.get();

				await repository.upload();

				expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

				expect(vol.readFileSync('/repository/profiles/level1/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
					disabled: [],
					enabled: ['pub3.ext1'],
				}));
			}); // }}}

			it('become.disabled', async () => { // {{{
				vol.fromJSON({
					'/repository/profiles/main/data/extensions.yml': vscode.ext2yml({
						disabled: ['pub1.ext3', 'pub3.ext1'],
						enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
					}),
				});

				vscode.setExtensions({
					disabled: ['pub1.ext3', 'pub3.ext1', 'pub1.ext2'],
					enabled: ['pub1.ext1', 'pub2.ext1', 'pub2.ext2'],
				});

				const repository = await RepositoryFactory.get();

				await repository.upload();

				expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

				expect(vol.readFileSync('/repository/profiles/level1/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
					disabled: ['pub1.ext2'],
					enabled: [],
				}));
			}); // }}}

			it('remove.enabled', async () => { // {{{
				vol.fromJSON({
					'/repository/profiles/main/data/extensions.yml': vscode.ext2yml({
						disabled: ['pub1.ext3', 'pub3.ext1'],
						enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
					}),
				});

				vscode.setExtensions({
					disabled: ['pub1.ext3', 'pub3.ext1'],
					enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1'],
				});

				const repository = await RepositoryFactory.get();

				await repository.upload();

				expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

				expect(vol.readFileSync('/repository/profiles/level1/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
					disabled: [],
					enabled: [],
					uninstall: ['pub2.ext2'],
				}));
			}); // }}}

			it('remove.disabled', async () => { // {{{
				vol.fromJSON({
					'/repository/profiles/main/data/extensions.yml': vscode.ext2yml({
						disabled: ['pub1.ext3', 'pub3.ext1'],
						enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
					}),
				});

				vscode.setExtensions({
					disabled: ['pub1.ext3'],
					enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
				});

				const repository = await RepositoryFactory.get();

				await repository.upload();

				expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

				expect(vol.readFileSync('/repository/profiles/level1/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
					disabled: [],
					enabled: [],
					uninstall: ['pub3.ext1'],
				}));
			}); // }}}
		});

		describe('unmanaged', () => {
			before(() => { // {{{
				vscode.setManageExtensions(false);
			});

			after(() => { // {{{
				vscode.setManageExtensions(true);
			});

			it('disabled', async () => { // {{{
				vol.fromJSON({
					'/repository/profiles/main/data/extensions.yml': vscode.ext2yml({
						disabled: ['pub1.ext3', 'pub3.ext1'],
						enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2'],
					}),
				});

				vscode.setExtensions({
					disabled: [],
					enabled: ['pub1.ext1', 'pub1.ext2', 'pub2.ext1', 'pub2.ext2', 'pub3.ext2'],
				});

				const repository = await RepositoryFactory.get();

				await repository.upload();

				expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

				expect(vol.readFileSync('/repository/profiles/level1/data/extensions.yml', 'utf8')).to.eql(vscode.ext2yml({
					disabled: [],
					enabled: ['pub3.ext2'],
					uninstall: ['pub1.ext3', 'pub3.ext1'],
				}));
			}); // }}}
		});
	});

	describe('keybindings', () => {
		it('nopatch', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.keybindings,
				'/repository/profiles/main/data/keybindings.json': keybindingsFxt.json.gotoline,
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);
			vscode.setKeybindings(keybindingsFxt.json.gotolineReload);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/keybindings.diff.yml')).to.be.false;
		}); // }}}
	});

	describe('settings', () => {
		it('nopatch', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.basics,
			});

			vscode.setSettings(userSettingsFxt.json.basicsAdd);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/data/settings.json.patch')).to.be.false;
		}); // }}}
	});

	describe('snippets', () => {
		it('add.one', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
			});

			vscode.addSnippet('loop', snippetsFxt.json.loop);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/data/snippets/loop.json', 'utf8')).to.eql(snippetsFxt.json.loop);
		}); // }}}

		it('add.some', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
			});

			vscode.addSnippet('loop', snippetsFxt.json.loop);
			vscode.addSnippet('loop2', snippetsFxt.json.loop);
			vscode.addSnippet('loop3', snippetsFxt.json.loop);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/data/snippets/loop.json', 'utf8')).to.eql(snippetsFxt.json.loop);
			expect(vol.readFileSync('/repository/profiles/level1/data/snippets/loop2.json', 'utf8')).to.eql(snippetsFxt.json.loop);
			expect(vol.readFileSync('/repository/profiles/level1/data/snippets/loop3.json', 'utf8')).to.eql(snippetsFxt.json.loop);
		}); // }}}

		it('edit', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/snippets/loop.json': snippetsFxt.json.div,
			});

			vscode.addSnippet('loop', snippetsFxt.json.loop);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/main/data/snippets/loop.json', 'utf8')).to.eql(snippetsFxt.json.div);
			expect(vol.readFileSync('/repository/profiles/level1/data/snippets/loop.json', 'utf8')).to.eql(snippetsFxt.json.loop);
		}); // }}}

		it('remove', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/snippets/loop.json': snippetsFxt.json.loop,
			});

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/data/snippets.diff.yml', 'utf8')).to.eql('removed:\n  - loop.json\n');
		}); // }}}

		it('same.one', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/snippets/loop.json': snippetsFxt.json.loop,
			});

			vscode.addSnippet('loop', snippetsFxt.json.loop);
			vscode.addSnippet('typescriptreact', snippetsFxt.json.typescriptreact);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/data/snippets/loop.json')).to.be.false;
		}); // }}}

		it('same.some', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/snippets/hello.json': snippetsFxt.json.hello,
				'/repository/profiles/main/data/snippets/loop.json': snippetsFxt.json.loop,
				'/repository/profiles/main/data/snippets/typescriptreact.json': snippetsFxt.json.typescriptreact,
			});

			vscode.addSnippet('hello', snippetsFxt.json.hello);
			vscode.addSnippet('loop', snippetsFxt.json.loop);
			vscode.addSnippet('typescriptreact', snippetsFxt.json.typescriptreact);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/data/snippets/hello.json')).to.be.false;
			expect(vol.existsSync('/repository/profiles/level1/data/snippets/loop.json')).to.be.false;
			expect(vol.existsSync('/repository/profiles/level1/data/snippets/typescriptreact.json')).to.be.false;
		}); // }}}
	});

	/* describe('settings', () => {
		it('add', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.basics,
			});

			vscode.setSettings(userSettingsFxt.json.basicsAdd);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/data/settings.json.patch', 'utf8')).to.eql(userSettingsFxt.patch.basicsAdd);
		}); // }}}

		it('edit', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.basics,
			});

			vscode.setSettings(userSettingsFxt.json.basicsEdit);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/data/settings.json.patch', 'utf8')).to.eql(userSettingsFxt.patch.basicsEdit);
		}); // }}}

		it('remove', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.basics,
			});

			vscode.setSettings(userSettingsFxt.json.basicsRemove);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/data/settings.json.patch', 'utf8')).to.eql(userSettingsFxt.patch.basicsRemove);
		}); // }}}

		it('attr.same', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.attr,
			});

			vscode.setPlatform('linux');
			vscode.setSettings(userSettingsFxt.json.attr);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/data/settings.json.patch')).to.be.false;
		}); // }}}

		it('attr.edit', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.empty,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.attr,
			});

			vscode.setPlatform('linux');
			vscode.setSettings(userSettingsFxt.json.attrEdit);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/data/settings.json.patch', 'utf8')).to.equal(userSettingsFxt.patch.attrEdit);
		}); // }}}
	}); */

	/* describe('keybindings', () => {
		it('add.0', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.keybindings,
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);
			vscode.setKeybindings(keybindingsFxt.json.gotoline);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/keybindings.diff.yml', 'utf8')).to.eql(yaml.stringify({
				add: [
  					{ key: 'cmd+l', command: 'workbench.action.gotoLine' },
					{ key: 'ctrl+g', command: '-workbench.action.gotoLine' },
				],
				remove: [],
			}));
		}); // }}}

		it('add.1', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.keybindings,
				'/repository/profiles/main/data/keybindings.json': keybindingsFxt.json.gotoline,
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);
			vscode.setKeybindings(keybindingsFxt.json.gotolineReload);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/keybindings.diff.yml', 'utf8')).to.eql(yaml.stringify({
				add: [
  					{ key: "cmd+r", command: "workbench.action.reloadWindow" },
				],
				remove: [],
			}));
		}); // }}}

		it('same', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.keybindings,
				'/repository/profiles/main/data/keybindings.json': keybindingsFxt.json.gotoline,
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);
			vscode.setKeybindings(keybindingsFxt.json.gotoline);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/keybindings.diff.yml')).to.be.false;
		}); // }}}

		it('inverted', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.keybindings,
				'/repository/profiles/main/data/keybindings.json': JSON.stringify([
					{ key: 'ctrl+g', command: '-workbench.action.gotoLine' },
  					{ key: 'cmd+l', command: 'workbench.action.gotoLine' },
				]),
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);
			vscode.setKeybindings(keybindingsFxt.json.gotoline);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.existsSync('/repository/profiles/level1/keybindings.diff.yml')).to.be.false;
		}); // }}}

		it('remove', async () => { // {{{
			vol.fromJSON({
				'/repository/profiles/main/.sync.yml': dotsyncFxt.yml.keybindings,
				'/repository/profiles/main/extensions.yml': extensionsFxt.yml.empty,
				'/repository/profiles/main/data/settings.json': userSettingsFxt.json.keybindings,
				'/repository/profiles/main/data/keybindings.json': keybindingsFxt.json.gotolineReload,
			});

			vscode.setSettings(userSettingsFxt.json.keybindings);
			vscode.setKeybindings(keybindingsFxt.json.gotoline);

			const repository = await RepositoryFactory.get();

			await repository.upload();

			expect(vscode.outputLines.pop()).to.eql('[info] serialize done');

			expect(vol.readFileSync('/repository/profiles/level1/keybindings.diff.yml', 'utf8')).to.eql(yaml.stringify({
				add: [],
				remove: [
					{ key: "cmd+r", command: "workbench.action.reloadWindow" },
				],
			}));
		}); // }}}
	}); */
});
