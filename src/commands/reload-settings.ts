import { RepositoryFactory } from '../repository-factory';
import { Logger } from '../utils/logger';

export async function reloadSettings(): Promise<void> {
	try {
		await RepositoryFactory.reload();
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
