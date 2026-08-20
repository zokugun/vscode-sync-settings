import path from 'node:path';

export function getEditorUserSettingsPath(userDataPath: string): string {
	return path.join(userDataPath, 'settings.json');
}
