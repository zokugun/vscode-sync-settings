import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import process from 'process';
import vscode from 'vscode';

export async function getEditorStorage(): Promise<string> {
	if(process.env.VSCODE_PORTABLE) {
		return process.env.VSCODE_PORTABLE;
	}
	else {
		const product = JSON.parse(await fs.readFile(path.join(vscode.env.appRoot, 'product.json'), 'utf-8')) as { dataFolderName: string };

		return path.join(os.homedir(), product.dataFolderName);
	}
}
