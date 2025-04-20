import path from 'path';
import fse from 'fs-extra';
import { type FileRepository } from '../repositories/file.js';

export async function copyProfile(profile: string | null, originalDir: string, temporaryDir: string, repository: FileRepository): Promise<void> { // {{{
	if(profile === null) {
		profile = repository.profile;

		const profilePath = path.join(originalDir, profile, 'profile.yml');

		if(fse.existsSync(profilePath)) {
			await fse.copy(profilePath, path.join(temporaryDir, profile, 'profile.yml'));
		}
	}

	const settings = await repository.loadProfileSettings(profile);

	if(settings.extends) {
		await fse.copy(path.join(originalDir, settings.extends), path.join(temporaryDir, settings.extends));

		return copyProfile(settings.extends, originalDir, temporaryDir, repository);
	}
} // }}}
