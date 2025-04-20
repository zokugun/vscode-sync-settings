import process from 'process';
import { getExtensionDataPath } from './get-extension-data-path.js';

export async function getExtensionDataUri(): Promise<string> {
	const path = await getExtensionDataPath();

	if(process.platform === 'win32') {
		return '/' + path.replaceAll('\\', '/');
	}
	else {
		return path;
	}
}
