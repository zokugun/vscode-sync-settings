import os from 'os';
import path from 'path';
import fse from 'fs-extra';
import vscode, { Uri } from 'vscode';
import { FileRepository } from '../repositories/file';
import { Resource } from '../repository';
import { RepositoryFactory } from '../repository-factory';
import { Settings } from '../settings';

async function hasDifferences(uriA: Uri, uriB: Uri): Promise<boolean> { // {{{
	let contentA;
	let contentB;
	let deletedA = false;
	let deletedB = false;

	try {
		contentA = await fse.readFile(uriA.fsPath, 'utf-8');
		contentB = await fse.readFile(uriB.fsPath, 'utf-8');
	}
	catch {
		deletedA = true;
	}

	try {
		contentB = await fse.readFile(uriB.fsPath, 'utf-8');
	}
	catch {
		deletedB = true;
	}

	if(deletedA && deletedB) {
		return false;
	}

	if(deletedA) {
		await fse.writeFile(uriA.fsPath, 'This file has been deleted', 'utf-8');

		return true;
	}
	else if(deletedB) {
		await fse.writeFile(uriB.fsPath, 'This file has been deleted', 'utf-8');
		return true;
	}
	else {
		return contentA !== contentB;
	}
} // }}}

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
