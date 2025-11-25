import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import vscode, { Uri } from 'vscode';
import { FileRepository } from '../repositories/file.js';
import { RepositoryFactory } from '../repository-factory.js';
import { Resource } from '../repository.js';
import { Settings } from '../settings.js';
import { EXTENSION_NAME } from '../utils/constants.js';
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
		const toRemoves: string[] = [];

		const oldExtensionsUri = Uri.file(oldRepository.getProfileExtensionsPath());
		const newExtensionsUri = Uri.file(newRepository.getProfileExtensionsPath());
		if(await hasDifferences(oldExtensionsUri, newExtensionsUri, toRemoves)) {
			await vscode.commands.executeCommand('vscode.diff', oldExtensionsUri, newExtensionsUri, 'extensions.yml', { preview: false });

			identical = false;
		}

		if(!profileSettings.extends) {
			if(resources.includes(Resource.Settings)) {
				const oldUri = Uri.file(oldRepository.getProfileUserSettingsPath());
				const newUri = Uri.file(newRepository.getProfileUserSettingsPath());
				if(await hasDifferences(oldUri, newUri, toRemoves)) {
					await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, 'settings.json', { preview: false });

					identical = false;
				}
			}

			if(resources.includes(Resource.Keybindings)) {
				const oldUri = Uri.file(oldRepository.getProfileKeybindingsPath(oldRepository.profile, keybindingsPerPlatform));
				const newUri = Uri.file(newRepository.getProfileKeybindingsPath(newRepository.profile, keybindingsPerPlatform));
				if(await hasDifferences(oldUri, newUri, toRemoves)) {
					await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, 'keybindings.json', { preview: false });

					identical = false;
				}
			}
		}

		if(toRemoves.length > 0) {
			for(const path of toRemoves) {
				await fse.remove(path);
			}
		}

		if(identical) {
			await vscode.window.showInformationMessage(`Source: ${EXTENSION_NAME}\n\nThere is no differences.`, { modal: true });
		}
	}
	else {
		await vscode.window.showInformationMessage(`Source: ${EXTENSION_NAME}\n\nNo differences can be shown since the repository isn't defined.`, { modal: true });
	}
}
