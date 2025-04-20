import { createHash } from 'crypto';
import fs from 'fs/promises';
import fse from 'fs-extra';
import { Uri } from 'vscode';
import { type Settings } from '../settings.js';
import { exists } from './exists.js';

export namespace TemporaryRepository {
	export function getPath(settings: Settings): string { // {{{
		return Uri.joinPath(settings.globalStorageUri, 'repository').fsPath;
	} // }}}

	export async function initialize(settings: Settings, ...hashes: string[]): Promise<void> { // {{{
		const newHash = createHash('sha256').update(hashes.join(',')).digest('hex');
		const path = getPath(settings);
		const hashPath = `${path}.hash`;

		if(await exists(hashPath)) {
			const oldHash = await fs.readFile(hashPath, 'utf8');

			if(newHash === oldHash) {
				return;
			}
		}

		await fse.remove(path);

		await fs.writeFile(hashPath, newHash, 'utf8');
	} // }}}

	export async function terminate(settings: Settings): Promise<void> { // {{{
		const path = getPath(settings);

		await fse.remove(path);
		await fse.remove(`${path}.hash`);
	} // }}}
}
