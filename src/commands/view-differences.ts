import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import vscode, { Uri } from 'vscode';
import { FileRepository } from '../repositories/file';
import { Resource } from '../repository';
import { RepositoryFactory } from '../repository-factory';
import { Settings } from '../settings';

export async function viewDifferences(): Promise<void> {
	const oldRepository = await RepositoryFactory.get();

	if(oldRepository instanceof FileRepository) {
		const temporaryDir = await fse.mkdtemp(path.join(os.tmpdir(), 'sync-settings-'));
		const settings = Settings.get();
		const newRepository = new FileRepository(settings, temporaryDir);

		await newRepository.initialize();
		await newRepository.upload();

		const config = vscode.workspace.getConfiguration('syncSettings');
		const resources = config.get<string[]>('resources') ?? [Resource.Extensions, Resource.Keybindings, Resource.Settings, Resource.Snippets, Resource.UIState];
		const keybindingsPerPlatform = config.get<boolean>('keybindingsPerPlatform') ?? true;

		const profileSettings = await oldRepository.loadProfileSettings();

		const oldExtensionsUri = Uri.file(oldRepository.getProfileExtensionsPath());
		const newExtensionsUri = Uri.file(newRepository.getProfileExtensionsPath());
		if(await fse.readFile(oldExtensionsUri.fsPath, 'utf-8') !== await fse.readFile(newExtensionsUri.fsPath, 'utf-8')) {
			await vscode.commands.executeCommand('vscode.diff', oldExtensionsUri, newExtensionsUri, 'extensions.yml', { preview: false });
		}

		if(!profileSettings.extends) {
			if(resources.includes(Resource.Settings)) {
				const oldUri = Uri.file(oldRepository.getProfileUserSettingsPath());
				const newUri = Uri.file(newRepository.getProfileUserSettingsPath());
				if(await fse.readFile(oldUri.fsPath, 'utf-8') !== await fse.readFile(newUri.fsPath, 'utf-8')) {
					await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, 'settings.json', { preview: false });
				}
			}

			if(resources.includes(Resource.Keybindings)) {
				const oldUri = Uri.file(oldRepository.getProfileKeybindingsPath(oldRepository.profile, keybindingsPerPlatform));
				const newUri = Uri.file(newRepository.getProfileKeybindingsPath(newRepository.profile, keybindingsPerPlatform));
				if(await fse.readFile(oldUri.fsPath, 'utf-8') !== await fse.readFile(newUri.fsPath, 'utf-8')) {
					await vscode.commands.executeCommand('vscode.diff', oldUri, newUri, 'keybindings.json', { preview: false });
				}
			}
		}
	}
	else {
		await vscode.window.showInformationMessage('No differences can be shwon since the repository isn\'t defined.');
	}
}
