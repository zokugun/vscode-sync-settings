import { ExtensionList, Hook, Repository } from '../repository';
import { RepositoryType } from '../repository-type';

export class DummyRepository extends Repository {
	public override readonly type = RepositoryType.DUMMY;

	public override async deleteProfile(_profile: string): Promise<void> { // {{{
	} // }}}

	public override async download(): Promise<void> { // {{{
	} // }}}

	public override async duplicateProfileTo(_originalProfile: string, _newProfile: string): Promise<void> { // {{{
	} // }}}

	public override async extendProfileTo(_originalProfile: string, _newProfile: string): Promise<void> { // {{{
	} // }}}

	public override getProfileSettingsPath(_profile?: string): string { // {{{
		return '';
	} // }}}

	public override getRepositoryPath(): string { // {{{
		return '';
	} // }}}

	public override async initialize(): Promise<void> { // {{{
	} // }}}

	public override async listProfiles(): Promise<string[]> { // {{{
		return [];
	} // }}}

	public override async listProfileExtensions(_profile?: string): Promise<ExtensionList> { // {{{
		return {
			enabled: [],
			disabled: [],
		};
	} // }}}

	public override async restoreProfile(): Promise<void> { // {{{
	} // }}}

	public override async runHook(_hook: Hook): Promise<void> { // {{{
	} // }}}

	public override async serializeProfile(): Promise<void> { // {{{
	} // }}}

	public override async terminate(): Promise<void> { // {{{
	} // }}}

	public override async upload(): Promise<void> { // {{{
	} // }}}
}
