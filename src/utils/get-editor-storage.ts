import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from 'process';
import vscode from 'vscode';

let $path: string = '';

export async function getEditorStorage(context?: vscode.ExtensionContext): Promise<string> {
	if(!$path) {
		if(process.env.VSCODE_PORTABLE) {
			$path = process.env.VSCODE_PORTABLE;
		}
		else if(context?.extensionMode === vscode.ExtensionMode.Production) {
			$path = path.normalize(path.join(context.extensionPath, '..', '..'));
		}
		else {
			const product = JSON.parse(await fs.readFile(path.join(vscode.env.appRoot, 'product.json'), 'utf8')) as { dataFolderName: string };

			$path = path.join(os.homedir(), product.dataFolderName);
		}
	}

	return $path;
}
