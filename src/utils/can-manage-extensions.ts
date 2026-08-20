import vscode from 'vscode';

export async function canManageExtensions(): Promise<boolean> {
	const commands = await vscode.commands.getCommands();

	return commands.some((command) => command === 'workbench.extensions.disableExtension' || command === 'workbench.extensions.enableExtension');
}
