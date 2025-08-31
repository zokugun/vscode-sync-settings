import { window } from 'vscode';
import { RepositoryFactory } from '../repository-factory.js';
import { Logger } from '../utils/logger.js';

export async function createProfile(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	try {
		const repository = await RepositoryFactory.get();
		const profiles = await repository.listProfiles();

		const newProfile = await window.showInputBox({
			title: 'Create new profile',
			placeHolder: 'New profile name',
			validateInput(value) {
				const correct = value.replaceAll(/[^\w\-.]/g, '');
				if(correct === value) {
					return null;
				}
				else {
					return correct;
				}
			},
		});

		if(typeof newProfile !== 'string' || newProfile.length === 0 || profiles.includes(newProfile)) {
			return;
		}

		const profile = repository.profile;

		const quickPickItems = [
			{
				label: `Duplicate current profile '${profile}'`,
				picked: true,
			},
			{
				label: 'Duplicate an existing profile',
			},
			{
				label: 'Extends an existing profile',
			},
			{
				label: 'Blank profile',
			},
		];

		const selected = await window.showQuickPick(quickPickItems, {
			placeHolder: 'Create as',
		});

		if(!selected) {
			return;
		}
		else if(selected === quickPickItems[0]) {
			await repository.duplicateProfileTo(profile, newProfile);
		}
		else if(selected === quickPickItems[1]) {
			const selected = await window.showQuickPick(profiles, {
				placeHolder: 'Profile to duplicate from',
			});

			if(!selected) {
				return;
			}

			await repository.duplicateProfileTo(selected, newProfile);
		}
		else if(selected === quickPickItems[2]) {
			const selected = await window.showQuickPick(profiles, {
				placeHolder: 'Profile to extends from',
			});

			if(!selected) {
				return;
			}

			await repository.extendProfileTo(selected, newProfile);
		}

		const result = await window.showInformationMessage(
			`Do you want to switch and apply the new profile '${newProfile}'`,
			{
				modal: true,
			},
			'Yes',
		);

		if(result) {
			await RepositoryFactory.setProfile(newProfile);

			await repository.restoreProfile();
		}
	}
	catch (error: unknown) {
		Logger.error(error);
	}
}
