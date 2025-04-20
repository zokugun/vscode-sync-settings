import fse from 'fs-extra';
import { window, workspace } from 'vscode';
import { RepositoryFactory } from '../repository-factory.js';
import { exists } from '../utils/exists.js';

export async function openProfileSettings(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	const repository = await RepositoryFactory.get();
	const filePath = repository.getProfileSettingsPath();

	if(!await exists(filePath)) {
		await fse.createFile(filePath);
	}

	await window.showTextDocument(await workspace.openTextDocument(filePath));
}
