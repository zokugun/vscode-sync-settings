import globby from 'globby';

import { exists } from './exists.js';
import { getEditorSnippetsPath } from './get-editor-snippets-path.js';

export async function listEditorSnippets(userDataPath: string): Promise<string[]> {
	const editorPath = getEditorSnippetsPath(userDataPath);
	if(await exists(editorPath)) {
		return globby('**', {
			cwd: editorPath,
			followSymbolicLinks: false,
		});
	}
	else {
		return [];
	}
}
