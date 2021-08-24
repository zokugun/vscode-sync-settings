import path from 'path';
import { Buffer } from 'buffer';
import initSqlJs from 'sql.js';
import fse from 'fs-extra';

export async function writeStateDB(userDataPath: string, query: string, args?: Record<string, any>): Promise<void> {
	const SQL = await initSqlJs();
	const dbPath = path.join(userDataPath, 'globalStorage', 'state.vscdb');
	const buffer = await fse.readFile(dbPath);
	const db = new SQL.Database(buffer);

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
