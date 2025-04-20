import { Buffer } from 'buffer';
import path from 'path';
import fse from 'fs-extra';
import initSqlJs from 'sql.js';

export async function writeStateDB(userDataPath: string, query: string, args?: Record<string, any>): Promise<void> {
	const sql = await initSqlJs();
	const databasePath = path.join(userDataPath, 'globalStorage', 'state.vscdb');
	const buffer = await fse.readFile(databasePath);
	const database = new sql.Database(buffer);

	try {
		database.exec(query, args);

		const data = database.export();
		const buffer = Buffer.from(data);

		fse.writeFileSync(databasePath, buffer);
	}
	finally {
		database.close();
	}
}
