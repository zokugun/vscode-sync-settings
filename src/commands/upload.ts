import { RepositoryFactory } from '../repository-factory';
import { Logger } from '../utils/logger';

export async function upload(): Promise<void> {
	try {
		const repository = await RepositoryFactory.get();

		await repository.upload();
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
