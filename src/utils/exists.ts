import fs from 'fs/promises';

export async function exists(file: string): Promise<boolean> { // {{{
	try {
		await fs.access(file);

		return true;
	}
	catch {
		return false;
	}
} // }}}
