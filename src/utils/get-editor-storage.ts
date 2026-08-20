import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from 'process';
import vscode from 'vscode';

import { EDITOR_MODE, EditorMode } from './editor.js';
import { unsafeCast } from './unsafe-cast.js';

let $path: string = '';

export async function getEditorStorage(context?: vscode.ExtensionContext): Promise<string> {
	if(!$path) {
		if(EDITOR_MODE === EditorMode.Theia) {
			const packageJSON = unsafeCast<{ theia: { backend: { config: { configurationFolder: string } } } }>(JSON.parse(await fs.readFile(path.join(vscode.env.appRoot, 'package.json'), 'utf8')));

			$path = path.join(os.homedir(), packageJSON.theia.backend.config.configurationFolder ?? '.theia-ide');
		}
		else {
			if(process.env.VSCODE_PORTABLE) {
				$path = process.env.VSCODE_PORTABLE;
			}
			else if(context?.extensionMode === vscode.ExtensionMode.Production) {
				$path = path.normalize(path.join(context.extensionPath, '..', '..'));
			}
			else {
				const product = unsafeCast<{ dataFolderName: string }>(JSON.parse(await fs.readFile(path.join(vscode.env.appRoot, 'product.json'), 'utf8')));

				$path = path.join(os.homedir(), product.dataFolderName);
			}
		}
	}

	return $path;
}
