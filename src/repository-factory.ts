import { DummyRepository } from './repositories/dummy.js';
import { FileRepository } from './repositories/file.js';
import { LocalGitRepository } from './repositories/local-git.js';
import { RemoteGitRepository } from './repositories/remote-git.js';
import { RsyncRepository } from './repositories/rsync.js';
import { WebDAVRepository } from './repositories/webdav.js';
import { RepositoryType } from './repository-type.js';
import { type Repository } from './repository.js';
import { Settings } from './settings.js';
import { Logger } from './utils/logger.js';

let $instance: Repository | undefined;

async function create(settings: Settings): Promise<void> { // {{{
	$instance = undefined;

	if(settings.profile.length === 0) {
		$instance = new DummyRepository(settings);

		Logger.error('The `profile` property is required');
	}
	else if(settings.repository.type === RepositoryType.DUMMY) {
		$instance = new DummyRepository(settings);
	}
	else if(settings.repository.type === RepositoryType.FILE) {
		$instance = new FileRepository(settings);
	}
	else if(settings.repository.type === RepositoryType.GIT) {
		if(settings.repository.path) {
			$instance = new LocalGitRepository(settings);
		}
		else if(settings.repository.url) {
			$instance = new RemoteGitRepository(settings);
		}
		else {
			throw new Error('A `git` repository requires a `path` or `url` property');
		}
	}
	else if(settings.repository.type === RepositoryType.RSYNC) {
		$instance = new RsyncRepository(settings);
	}
	else if(settings.repository.type === RepositoryType.WEBDAV) {
		$instance = new WebDAVRepository(settings);
	}

	if(!$instance) {
		throw new Error(`The repository has an unknown type: ${settings.repository.type}`);
	}

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

	export async function isDummy(): Promise<boolean> { // {{{
		const repository = await get();

		if(repository instanceof DummyRepository) {
			Logger.error('The repository isn\'t valid. Please check the settings.');

			return true;
		}
		else {
			return false;
		}
	} // }}}

	export async function reload(): Promise<boolean> { // {{{
		const settings = Settings.get();

		if(await settings.reload()) {
			if($instance) {
				await $instance.terminate();

				await create(settings);
			}

			return true;
		}
		else {
			return false;
		}
	} // }}}

	export async function reset(): Promise<void> { // {{{
		if($instance) {
			await $instance.terminate();

			$instance = undefined;
		}
	} // }}}

	export async function setProfile(profile: string): Promise<void> { // {{{
		const settings = Settings.get();

		await settings.setProfile(profile);

		if($instance) {
			if(profile.length === 0) {
				if(!($instance instanceof DummyRepository)) {
					$instance = new DummyRepository(settings);
				}

				Logger.error('The `profile` property is required');
			}
			else {
				if($instance instanceof DummyRepository) {
					await create(settings);
				}
				else {
					await $instance.setProfile(profile);
				}
			}
		}
	} // }}}
}
