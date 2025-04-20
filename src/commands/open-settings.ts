import { window, workspace } from 'vscode';
import { Settings } from '../settings.js';

export async function openSettings(): Promise<void> {
	const settings = Settings.get();

	await window.showTextDocument(await workspace.openTextDocument(settings.settingsUri));
}
