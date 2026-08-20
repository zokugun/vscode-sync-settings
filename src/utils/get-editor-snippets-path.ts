import path from 'node:path';

export function getEditorSnippetsPath(userDataPath: string): string {
	return path.join(userDataPath, 'snippets');
}
