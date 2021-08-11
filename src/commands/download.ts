import vscode, { window } from 'vscode';
import { RepositoryFactory } from '../repository-factory';
import { Logger } from '../utils/logger';

export async function download(): Promise<void> {
	const config = vscode.workspace.getConfiguration('syncSettings');
	const confirmSync = config.get<boolean>('confirmSync') ?? false;
	const openOuputOnActivity = config.get<boolean>('openOuputOnActivity') ?? false;
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

	if(openOuputOnActivity) {
		Logger.show();
	}

	try {
		const repository = await RepositoryFactory.get();

		await repository.download();

		if(showFinishAlert) {
			await window.showInformationMessage('Your settings have been downloaded (repository -> user)');
		}
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
