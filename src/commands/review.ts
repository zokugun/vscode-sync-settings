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
import { upload } from './upload.js';

export async function review(): Promise<void> {
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
			identical = false;
		}

		if(identical && !profileSettings.extends) {
			if(resources.includes(Resource.Settings)) {
				const oldUri = Uri.file(oldRepository.getProfileUserSettingsPath());
				const newUri = Uri.file(newRepository.getProfileUserSettingsPath());
				if(await hasDifferences(oldUri, newUri)) {
					identical = false;
				}
			}

			if(identical && resources.includes(Resource.Keybindings)) {
				const oldUri = Uri.file(oldRepository.getProfileKeybindingsPath(oldRepository.profile, keybindingsPerPlatform));
				const newUri = Uri.file(newRepository.getProfileKeybindingsPath(newRepository.profile, keybindingsPerPlatform));
				if(await hasDifferences(oldUri, newUri)) {
					identical = false;
				}
			}
		}

		if(!identical) {
			const result = await vscode.window.showInformationMessage(
				`Source: ${EXTENSION_NAME}\n\nYour settings have been modified since the last save. Do you want to sync your settings?`,
				{
					modal: true,
				},
				'Yes',
			);

			if(result === 'Yes') {
				return upload();
			}
		}
	}
}
