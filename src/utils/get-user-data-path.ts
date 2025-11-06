import path from 'path';
import process from 'process';
import { type Settings } from '../settings.js';

let $path: string = '';

export function getUserDataPath(settings: Settings): string { // {{{
	if(!$path) {
		if(process.env.VSCODE_PORTABLE) {
			$path = path.resolve(process.env.VSCODE_PORTABLE, 'user-data', 'User');
		}
		else {
			$path = path.resolve(settings.globalStorageUri.fsPath, '..', '..');
		}
	}

	return $path;
} // }}}
