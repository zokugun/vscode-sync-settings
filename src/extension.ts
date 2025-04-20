import vscode from 'vscode';
import pkg from '../package.json';
import { createProfile } from './commands/create-profile.js';
import { deleteProfile } from './commands/delete-profile.js';
import { download } from './commands/download.js';
import { listMissingExtensions } from './commands/list-missing-extensions.js';
import { openProfileDirectory } from './commands/open-profile-directory.js';
import { openProfileSettings } from './commands/open-profile-settings.js';
import { openRepositoryDirectory } from './commands/open-repository-directory.js';
import { openSettings } from './commands/open-settings.js';
import { reset } from './commands/reset.js';
import { review } from './commands/review.js';
import { switchProfile } from './commands/switch-profile.js';
import { upload } from './commands/upload.js';
import { viewDifferences } from './commands/view-differences.js';
import { setupCrons } from './crons.js';
import { RepositoryFactory } from './repository-factory.js';
import { Settings } from './settings.js';
import { ThrottledDelayer } from './utils/async.js';
import { Logger } from './utils/logger.js';

const VERSION_KEY = 'version';

async function showWhatsNewMessage(version: string) { // {{{
	const actions: vscode.MessageItem[] = [{
		title: 'Homepage',
	}, {
		title: 'Release Notes',
	}];

	const result = await vscode.window.showInformationMessage(
		`Sync Settings has been updated to v${version} — check out what's new!`,
		...actions,
	);

	if(result !== null) {
		if(result === actions[0]) {
			await vscode.commands.executeCommand(
				'vscode.open',
				vscode.Uri.parse(`${pkg.homepage}`),
			);
		}
		else if(result === actions[1]) {
			await vscode.commands.executeCommand(
				'vscode.open',
				vscode.Uri.parse(`${pkg.homepage}/blob/master/CHANGELOG.md`),
			);
		}
	}
} // }}}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	context.globalState.setKeysForSync([VERSION_KEY]);

	const previousVersion = context.globalState.get<string>(VERSION_KEY);
	const currentVersion = pkg.version;

	const config = vscode.workspace.getConfiguration('syncSettings');

	if(previousVersion === undefined || currentVersion !== previousVersion) {
		void context.globalState.update(VERSION_KEY, currentVersion);

		const notification = config.get<string>('notification');

		if(previousVersion === undefined) {
			// don't show notification on install
		}
		else if(notification === 'major') {
			if(currentVersion.split('.')[0] > previousVersion.split('.')[0]) {
				void showWhatsNewMessage(currentVersion);
			}
		}
		else if(notification === 'minor') {
			if(currentVersion.split('.')[0] > previousVersion.split('.')[0] || (currentVersion.split('.')[0] === previousVersion.split('.')[0] && currentVersion.split('.')[1] > previousVersion.split('.')[1])) {
				void showWhatsNewMessage(currentVersion);
			}
		}
		else if(notification !== 'none') {
			void showWhatsNewMessage(currentVersion);
		}
	}

	await Settings.load(context);

	const disposables: vscode.Disposable[] = [];

	disposables.push(
		vscode.commands.registerCommand('syncSettings.createProfile', createProfile),
		vscode.commands.registerCommand('syncSettings.deleteProfile', deleteProfile),
		vscode.commands.registerCommand('syncSettings.download', download),
		vscode.commands.registerCommand('syncSettings.listMissingExtensions', listMissingExtensions),
		vscode.commands.registerCommand('syncSettings.openProfileDirectory', openProfileDirectory),
		vscode.commands.registerCommand('syncSettings.openProfileSettings', openProfileSettings),
		vscode.commands.registerCommand('syncSettings.openRepositoryDirectory', openRepositoryDirectory),
		vscode.commands.registerCommand('syncSettings.openSettings', openSettings),
		vscode.commands.registerCommand('syncSettings.reset', reset),
		vscode.commands.registerCommand('syncSettings.review', review),
		vscode.commands.registerCommand('syncSettings.switchProfile', switchProfile),
		vscode.commands.registerCommand('syncSettings.upload', upload),
		vscode.commands.registerCommand('syncSettings.viewDifferences', viewDifferences),
	);

	const settings = Settings.get();
	const fileChangesDelayer = new ThrottledDelayer<void>(200);
	const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(vscode.Uri.joinPath(settings.settingsUri, '..').fsPath, 'settings.yml'));

	watcher.onDidChange(() => {
		void fileChangesDelayer.trigger(async () => {
			try {
				await RepositoryFactory.reload();
			}
			catch (error: unknown) {
				Logger.error(error);
			}
		});
	});

	await setupCrons();

	vscode.workspace.onDidChangeConfiguration(async (event) => {
		if(event.affectsConfiguration('syncSettings.crons')) {
			await setupCrons();
		}
	});

	context.subscriptions.push(...disposables);
}
