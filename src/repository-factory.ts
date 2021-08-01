import { DummyRepository } from './repositories/dummy';
import { FileRepository, FileSettings } from './repositories/file';
import { LocalGitRepository, LocalGitSettings } from './repositories/local-git';
import { RemoteGitRepository, RemoteGitSettings } from './repositories/remote-git';
import { Repository } from './repository';
import { RepositoryType } from './repository-type';
import { Settings } from './settings';

let $instance: Repository | undefined;

async function create(settings: Settings): Promise<void> { // {{{
	$instance = undefined;

	if(settings.repository.type === RepositoryType.DUMMY) {
		$instance = new DummyRepository();
	}
	else if(settings.repository.type === RepositoryType.FILE) {
		$instance = new FileRepository(settings.repository as FileSettings);
	}
	else if(settings.repository.type === RepositoryType.GIT) {
		if(settings.repository.path) {
			$instance = new LocalGitRepository(settings.repository as LocalGitSettings);
		}
		else if(settings.repository.url) {
			$instance = new RemoteGitRepository(settings.repository as RemoteGitSettings);
		}
	}

	if(!$instance) {
		throw new Error(`The repository has a mysterious type: ${settings.repository.type}`);
	}

	$instance.setIncludes(settings.includes);

	return $instance.setProfile(settings.profile);
} // }}}

export namespace RepositoryFactory {
	export async function get(): Promise<Repository> { // {{{
		if($instance) {
			return $instance;
		}

		const settings = Settings.get();

		await create(settings);

		return $instance!;
	} // }}}

	export async function reload(): Promise<void> { // {{{
		const settings = Settings.get();

		await settings.reload();

		if($instance) {
			await $instance.terminate();

			return create(settings);
		}
	} // }}}

	export async function setProfile(profile: string): Promise<void> { // {{{
		if($instance) {
			await $instance.setProfile(profile);
		}

		const settings = Settings.get();

		return settings.setProfile(profile);
	} // }}}
}
