import { RepositoryFactory } from '../repository-factory';
import { Logger } from '../utils/logger';

export async function download(): Promise<void> {
	try {
		const repository = await RepositoryFactory.get();

		await repository.download();
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
