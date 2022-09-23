import arrayDiffer from 'array-differ';
import vscode from 'vscode';
import type { ExtensionId } from '../repository';
import { RepositoryFactory } from '../repository-factory';

function id(value: string | ExtensionId): string {
	return typeof value === 'string' ? value : value.id;
}

export async function listMissingExtensions(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	const repository = await RepositoryFactory.get();

	const syncSettings = vscode.workspace.getConfiguration('syncSettings');

	const ignoredExtensions = syncSettings.get<string[]>('ignoredExtensions') ?? [];
	const editor = await repository.listEditorExtensions(ignoredExtensions);
	const profile = await repository.listProfileExtensions();

	const doc = await vscode.workspace.openTextDocument({
		content: `enabled
-------
${arrayDiffer(profile.enabled.map(id), editor.enabled.map(id)).join('\n')}
-------

disabled
--------
${arrayDiffer(profile.disabled.map(id), editor.disabled.map(id)).join('\n')}
--------
`,
	});

	await vscode.window.showTextDocument(doc);
}
