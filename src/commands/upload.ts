import vscode, { window } from 'vscode';
import { Hook } from '../repository';
import { RepositoryFactory } from '../repository-factory';
import { Logger } from '../utils/logger';

export async function upload(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	const config = vscode.workspace.getConfiguration('syncSettings');
	const confirmSync = config.get<boolean>('confirmSync') ?? false;
	const openOutputOnActivity = config.get<boolean>('openOutputOnActivity') ?? false;
	const showFinishAlert = config.get<boolean>('showFinishAlert') ?? true;

	if(confirmSync) {
		const result = await window.showInformationMessage(
			'Do you want to upload your settings (user -> repository)?',
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

		await repository.runHook(Hook.PreUpload);

		if(await repository.upload()) {
			await repository.runHook(Hook.PostUpload);

			if(showFinishAlert) {
				await window.showInformationMessage('Your settings have been uploaded (user -> repository)');
			}
		}
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
