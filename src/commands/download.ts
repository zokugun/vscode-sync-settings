import vscode, { window } from 'vscode';
import { RepositoryFactory } from '../repository-factory.js';
import { Hook } from '../settings.js';
import { Logger } from '../utils/logger.js';

export async function download(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	const config = vscode.workspace.getConfiguration('syncSettings');
	const confirmSync = config.get<boolean>('confirmSync') ?? false;
	const openOutputOnActivity = config.get<boolean>('openOutputOnActivity') ?? false;
	const showFinishAlert = config.get<boolean>('showFinishAlert') ?? true;

	if(confirmSync) {
		const result = await window.showInformationMessage(
			'Do you want to download your settings (repository -> user)?',
			{
				modal: true,
			},
			'Yes',
		);

		if(!result) {
			return;
		}
	}

	if(openOutputOnActivity) {
		Logger.show();
	}

	try {
		const repository = await RepositoryFactory.get();

		await repository.runHook(Hook.PreDownload);

		if(await repository.download()) {
			await repository.runHook(Hook.PostDownload);

			if(showFinishAlert) {
				await window.showInformationMessage('Your settings have been downloaded (repository -> user)');
			}
		}
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
