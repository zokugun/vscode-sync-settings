import { window, workspace } from 'vscode';
import { Settings } from '../settings';

export async function openSettings(): Promise<void> {
	const settings = Settings.get();

	await window.showTextDocument(await workspace.openTextDocument(settings.settingsUri));
}
