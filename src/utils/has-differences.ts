import fse from 'fs-extra';
import { Uri } from 'vscode';

export async function hasDifferences(uriA: Uri, uriB: Uri, toRemoves?: string[]): Promise<boolean> { // {{{
	let contentA;
	let contentB;
	let deletedA = false;
	let deletedB = false;

	try {
		contentA = await fse.readFile(uriA.fsPath, 'utf8');
	}
	catch {
		deletedA = true;
	}

	try {
		contentB = await fse.readFile(uriB.fsPath, 'utf8');
	}
	catch {
		deletedB = true;
	}

	if(deletedA && deletedB) {
		return false;
	}

	if(deletedA) {
		await fse.ensureDir(Uri.joinPath(uriA, '..').fsPath);

		await fse.writeFile(uriA.fsPath, 'This file has been deleted', 'utf8');

		toRemoves?.push(uriA.fsPath);

		return true;
	}
	else if(deletedB) {
		await fse.ensureDir(Uri.joinPath(uriB, '..').fsPath);

		await fse.writeFile(uriB.fsPath, 'This file has been deleted', 'utf8');

		toRemoves?.push(uriB.fsPath);

		return true;
	}
	else {
		return contentA !== contentB;
	}
} // }}}
