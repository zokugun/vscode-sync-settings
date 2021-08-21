import path from 'path';
import vscode from 'vscode';
import { RepositoryFactory } from '../repository-factory';

export async function openProfileDirectory(): Promise<void> {
	const repository = await RepositoryFactory.get();
	const filePath = repository.getProfileSettingsPath();

	await vscode.env.openExternal(vscode.Uri.file(path.dirname(filePath)));
}
