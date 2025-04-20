import path from 'path';
import process from 'process';
import { type Settings } from '../settings.js';

export function getUserDataPath(settings: Settings): string { // {{{
	const globalStoragePath = process.env.VSCODE_PORTABLE ? path.resolve(process.env.VSCODE_PORTABLE, 'user-data') : path.resolve(settings.globalStorageUri.fsPath, '../../..');

	return path.resolve(globalStoragePath, 'User');
} // }}}
