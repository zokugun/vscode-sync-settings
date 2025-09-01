import { window } from 'vscode';
import { RepositoryFactory } from '../repository-factory.js';
import { Logger } from '../utils/logger.js';
import { showValidatingInputBox } from '../utils/show-validating-input-box.js';

export async function createProfile(): Promise<void> {
	if(await RepositoryFactory.isDummy()) {
		return;
	}

	try {
		const repository = await RepositoryFactory.get();
		const profiles = await repository.listProfiles();

		const answer = await showValidatingInputBox({
			title: 'Create new profile',
			placeHolder: 'New profile name',
			validateInput(value) {
				if(/[^\w\-.]/.test(value)) {
					return 'Profile name must only contain letters, numbers, underscores or dot ("A-Za-z0-9_-.").';
				}
				else if(profiles.includes(value)) {
					return `Profile "${value}" already exists`;
				}
				else {
					return null;
				}
			},
		});

		if(answer.fails) {
			void window.showErrorMessage(answer.error);

			return;
		}
		else if(answer.value === undefined || answer.value.length === 0) {
			return;
		}

		const newProfile = answer.value;
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
