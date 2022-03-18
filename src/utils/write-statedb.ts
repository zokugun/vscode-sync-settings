import { Buffer } from 'buffer';
import path from 'path';
import fse from 'fs-extra';
import initSqlJs from 'sql.js';

export async function writeStateDB(userDataPath: string, query: string, args?: Record<string, any>): Promise<void> {
	const sql = await initSqlJs();
	const dbPath = path.join(userDataPath, 'globalStorage', 'state.vscdb');
	const buffer = await fse.readFile(dbPath);
	const db = new sql.Database(buffer);

	try {
		db.exec(query, args);

		const data = db.export();
		const buffer = Buffer.from(data);

		fse.writeFileSync(dbPath, buffer);
	}
	finally {
		db.close();
	}
}
