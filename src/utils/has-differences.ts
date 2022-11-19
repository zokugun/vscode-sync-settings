import fse from 'fs-extra';
import { Uri } from 'vscode';

export async function hasDifferences(uriA: Uri, uriB: Uri): Promise<boolean> { // {{{
	let contentA;
	let contentB;
	let deletedA = false;
	let deletedB = false;

	try {
		contentA = await fse.readFile(uriA.fsPath, 'utf-8');
		contentB = await fse.readFile(uriB.fsPath, 'utf-8');
	}
	catch {
		deletedA = true;
	}

	try {
		contentB = await fse.readFile(uriB.fsPath, 'utf-8');
	}
	catch {
		deletedB = true;
	}

	if(deletedA && deletedB) {
		return false;
	}

	if(deletedA) {
		await fse.writeFile(uriA.fsPath, 'This file has been deleted', 'utf-8');

		return true;
	}
	else if(deletedB) {
		await fse.writeFile(uriB.fsPath, 'This file has been deleted', 'utf-8');
		return true;
	}
	else {
		return contentA !== contentB;
	}
} // }}}
