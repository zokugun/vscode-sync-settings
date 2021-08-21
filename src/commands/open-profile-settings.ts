import { window, workspace } from 'vscode';
import { RepositoryFactory } from '../repository-factory';

export async function openProfileSettings(): Promise<void> {
	const repository = await RepositoryFactory.get();
	const path = repository.getProfileSettingsPath();

	if(path) {
		await window.showTextDocument(await workspace.openTextDocument(path));
	}
}
