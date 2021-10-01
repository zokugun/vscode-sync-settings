import path from 'path';
import fse from 'fs-extra';
import initSqlJs, { QueryExecResult } from 'sql.js';
import { exists } from './exists';

export async function readStateDB(userDataPath: string, query: string, args?: Record<string, any>): Promise<QueryExecResult | undefined> {
	const SQL = await initSqlJs();
	const dbPath = path.join(userDataPath, 'globalStorage', 'state.vscdb');

	if(await exists(dbPath)) {
		const buffer = await fse.readFile(dbPath);
		const db = new SQL.Database(buffer);

		try {
			const result = db.exec(query, args);

			return result[0];
		}
		finally {
			db.close();
		}
	}
	else {
		return undefined;
	}
}
