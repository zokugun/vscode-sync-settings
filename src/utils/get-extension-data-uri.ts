import process from 'process';
import { getExtensionDataPath } from './get-extension-data-path';

export async function getExtensionDataUri(): Promise<string> {
	const path = await getExtensionDataPath();

	if(process.platform === 'win32') {
		return '/' + path.replace(/\\/g, '/');
	}
	else {
		return path;
	}
}
