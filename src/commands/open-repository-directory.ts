import vscode from 'vscode';
import { RepositoryFactory } from '../repository-factory.js';

export async function openRepositoryDirectory(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	const repository = await RepositoryFactory.get();
	const filePath = repository.getRepositoryPath();

	await vscode.env.openExternal(vscode.Uri.file(filePath));
}
