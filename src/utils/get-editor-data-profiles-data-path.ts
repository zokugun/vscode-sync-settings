import path from 'node:path';

export function getEditorDataProfilesDataPath(userDataPath: string): string {
	return path.join(userDataPath, 'profiles');
}
