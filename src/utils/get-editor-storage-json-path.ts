import path from 'node:path';

export function getEditorStorageJsonPath(userDataPath: string): string {
	return path.join(userDataPath, 'globalStorage', 'storage.json');
}
