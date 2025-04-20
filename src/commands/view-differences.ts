import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import vscode, { Uri } from 'vscode';
import { FileRepository } from '../repositories/file.js';
import { RepositoryFactory } from '../repository-factory.js';
import { Resource } from '../repository.js';
import { Settings } from '../settings.js';
import { copyProfile } from '../utils/copy-profile.js';
import { hasDifferences } from '../utils/has-differences.js';

export async function viewDifferences(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	const oldRepository = await RepositoryFactory.get();

	if(oldRepository instanceof FileRepository) {
		const temporaryDir = await fse.mkdtemp(path.join(os.tmpdir(), 'sync-settings-'));
		const settings = Settings.get();
		const newRepository = new FileRepository(settings, temporaryDir);

		await newRepository.setProfile(oldRepository.profile);

		await copyProfile(null, path.join(settings.globalStorageUri.fsPath, 'repository', 'profiles'), path.join(temporaryDir, 'profiles'), newRepository);

		await newRepository.upload();

		const config = vscode.workspace.getConfiguration('syncSettings');
		const resources = config.get<string[]>('resources') ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets, Resource.UIState];
		const keybindingsPerPlatform = config.get<boolean>('keybindingsPerPlatform') ?? true;

		const profileSettings = await oldRepository.loadProfileSettings();

		let identical = true;

		const oldExtensionsUri = Uri.file(oldRepository.getProfileExtensionsPath());
		const newExtensionsUri = Uri.file(newRepository.getProfileExtensionsPath());
		if(await hasDifferences(oldExtensionsUri, newExtensionsUri)) {
			await vscode.commands.executeCommand('vscode.diff', oldExtensionsUri, newExtensionsUri, 'extensions.yml', { preview: false });

			identical = false;
		}

		if(!profileSettings.extends) {
			if(resources.includes(Resource.Settings)) {
				const oldUri = Uri.file(oldRepository.getProfileUserSettingsPath());
				const newUri = Uri.file(newRepository.getProfileUserSettingsPath());
				if(await hasDifferences(oldUri, newUri)) {
					await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, 'settings.json', { preview: false });

					identical = false;
				}
			}

			if(resources.includes(Resource.Keybindings)) {
				const oldUri = Uri.file(oldRepository.getProfileKeybindingsPath(oldRepository.profile, keybindingsPerPlatform));
				const newUri = Uri.file(newRepository.getProfileKeybindingsPath(newRepository.profile, keybindingsPerPlatform));
				if(await hasDifferences(oldUri, newUri)) {
					await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, 'keybindings.json', { preview: false });

					identical = false;
				}
			}
		}

		if(identical) {
			await vscode.window.showInformationMessage('There is no differences.', { modal: true });
		}
	}
	else {
		await vscode.window.showInformationMessage('No differences can be shown since the repository isn\'t defined.', { modal: true });
	}
}
