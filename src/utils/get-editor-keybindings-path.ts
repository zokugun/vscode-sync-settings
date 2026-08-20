import path from 'node:path';

import { EDITOR_MODE, EditorMode } from './editor.js';

export function getEditorKeybindingsPath(userDataPath: string): string {
	if(EDITOR_MODE === EditorMode.Theia) {
		return path.join(userDataPath, 'keymaps.json');
	}
	else {
		return path.join(userDataPath, 'keybindings.json');
	}
}
