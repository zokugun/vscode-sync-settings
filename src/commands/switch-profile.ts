import { window } from 'vscode';
import { RepositoryFactory } from '../repository-factory.js';
import { Logger } from '../utils/logger.js';

export async function switchProfile(): Promise<void> {
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
			placeHolder: 'Profile to switch to',
		});

		if(!selected || selected.label === profile) {
			return;
		}

		const newProfile = selected.label;

		Logger.info('switching to profile:', newProfile);

		await RepositoryFactory.setProfile(newProfile);

		const result = await window.showInformationMessage(
			'Do you want to apply the profile?',
			{
				modal: true,
			},
			'Yes',
		);

		if(result) {
			await repository.restoreProfile();
		}
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
