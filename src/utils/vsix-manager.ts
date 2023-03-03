import vscode from 'vscode';

export type VSIXManager = {
	installExtensions(update?: boolean): Promise<void>;
	listManagedExtensions(): Promise<string[]>;
};

export function getVSIXManager(): VSIXManager | undefined {
	try {
		const extension = vscode.extensions.getExtension<VSIXManager>('zokugun.vsix-manager');

		return extension?.exports;
	}
	catch {
	}
}

export async function listVSIXExtensions(): Promise<string[]> {
	const vsixManager = getVSIXManager();

	return await vsixManager?.listManagedExtensions() ?? [];
}
