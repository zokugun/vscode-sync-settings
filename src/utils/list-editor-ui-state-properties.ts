import type { ExtensionList } from '../repository';

import { isTypedArray } from 'node:util/types';
import os from 'os';
import { isString } from '@zokugun/is-it-type';

import { getExtensionDataUri } from './get-extension-data-uri.js';
import { readStateDB } from './read-statedb.js';

export async function listEditorUIStateProperties(userDataPath: string, extensions: ExtensionList | string[]): Promise<Record<string, number | string | null>> {
	const keys = Array.isArray(extensions)
		? extensions
		: [
			...extensions.disabled.map(({ id }) => id),
			...extensions.enabled.map(({ id }) => id),
		];

	const data = await readStateDB(userDataPath, `SELECT key, value FROM ItemTable WHERE key IN ('${keys.join('\', \'')}') OR key LIKE 'workbench.%' ORDER BY key COLLATE NOCASE ASC`);
	if(!data) {
		return {};
	}

	const properties: Record<string, number | string | null> = {};
	const extensionDataPath = await getExtensionDataUri();
	const homeDirectory = os.homedir();

	for(const [key, value] of data.values) {
		let property: number | string | null | undefined;

		if(isString(value)) {
			property = value.replaceAll(extensionDataPath, '%%EXTENSION_DATA_PATH%%');

			if(property.includes(homeDirectory)) {
				continue;
			}
		}
		else if(isTypedArray(value)) {
			property = Buffer.from(value).toString('utf-8');
		}
		else {
			property = value;
		}

		properties[String(key)] = property;
	}

	return properties;
}
