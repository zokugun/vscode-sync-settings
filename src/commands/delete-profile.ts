import { window } from 'vscode';
import { RepositoryFactory } from '../repository-factory.js';
import { EXTENSION_NAME } from '../utils/constants.js';
import { Logger } from '../utils/logger.js';

export async function deleteProfile(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	try {
		const repository = await RepositoryFactory.get();
		const profile = repository.profile;
		const profiles = await repository.listProfiles();

		const quickPickItems = profiles.map((name) => ({
			label: name,
			picked: name === profile,
		}));

		const selected = await window.showQuickPick(quickPickItems, {
			placeHolder: 'Profile to delete',
		});

		if(!selected) {
			return;
		}
		else if(selected.label === profile) {
			await window.showInformationMessage(`Source: ${EXTENSION_NAME}\n\nYou can't delete the current profile '${profile}'`, { modal: true });

			return;
		}

		const newProfile = selected.label;

		Logger.info('deleting profile:', newProfile);

		await repository.deleteProfile(newProfile);

		await window.showInformationMessage(`Source: ${EXTENSION_NAME}\n\nThe profile '${newProfile}' has been deleted`, { modal: true });
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
