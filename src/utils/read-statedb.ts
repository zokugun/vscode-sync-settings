import path from 'path';
import fse from 'fs-extra';
import initSqlJs, { type QueryExecResult, type SqlValue } from 'sql.js';

import { exists } from './exists.js';

export async function readStateDB(userDataPath: string, query: string, args?: Record<string, SqlValue>): Promise<QueryExecResult | undefined> {
	const sql = await initSqlJs();
	const databasePath = path.join(userDataPath, 'globalStorage', 'state.vscdb');

	if(await exists(databasePath)) {
		const buffer = await fse.readFile(databasePath);
		const database = new sql.Database(buffer);

		try {
			const result = database.exec(query, args);

			return result[0];
		}
		finally {
			database.close();
		}
	}
	else {
		return undefined;
	}
}
