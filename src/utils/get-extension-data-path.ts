import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import vscode from 'vscode';

export async function getExtensionDataPath(): Promise<string> { // {{{
	if(process.env.VSCODE_PORTABLE) {
		return path.join(process.env.VSCODE_PORTABLE, 'extensions');
	}
	else {
		const product = JSON.parse(await fs.readFile(path.join(vscode.env.appRoot, 'product.json'), 'utf-8')) as { dataFolderName: string };

		return path.join(os.homedir(), product.dataFolderName, 'extensions');
	}
} // }}}
