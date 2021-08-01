import vscode from 'vscode';
import { RepositoryFactory } from '../repository-factory';
import { Logger } from '../utils/logger';

export async function reset(): Promise<void> {
	try {
		const result = await vscode.window.showInformationMessage(
			'Do you really want to remove all your actual settings and your actual extensions?',
			{ modal: true },
			{ title: 'Yes' },
		);

		if(result) {
			const result = await vscode.window.showInformationMessage(
				'Are you sure?',
				{ modal: true },
				{ title: 'Yes' },
			);

			if(result) {
				const repository = await RepositoryFactory.get();

				await repository.reset();
			}
		}
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
