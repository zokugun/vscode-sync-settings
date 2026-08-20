import path from 'node:path';

export function getEditorTasksPath(userDataPath: string): string {
	return path.join(userDataPath, 'tasks.json');
}
