import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import camelcase from 'camelcase';

const BASENAME_REGEX = /^(.*)\.([^.]+)$/;

export function fixtures(directory: string): Record<string, Record<string, string>> {
	const root = join('.', 'test', 'fixtures', directory);
	const files = readdirSync(root, {
		withFileTypes: true,
	});

	const result: Record<string, Record<string, string>> = {};

	for(const file of files) {
		if(file.isFile()) {
			const match = BASENAME_REGEX.exec(file.name);

			if(match) {
				const groupName = match[2].toLowerCase();
				const caseName = camelcase(match[1]);

				result[groupName] ||= {};

				result[groupName][caseName] = readFileSync(join(root, file.name), 'utf8');
			}
		}
	}

	return result;
}
