import { Repository } from '../repository';
import { RepositoryType } from '../repository-type';

export class DummyRepository extends Repository {
	public readonly path = '';
	public readonly type = RepositoryType.DUMMY;

	public async download(): Promise<void> { // {{{
	} // }}}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public override async duplicateProfileTo(originalProfile: string, newProfile: string): Promise<void> { // {{{
	} // }}}

	public override async initialize(): Promise<void> { // {{{
	} // }}}

	public override async listProfiles(): Promise<string[]> { // {{{
		return [];
	} // }}}

	public override async terminate(): Promise<void> { // {{{
	} // }}}

	public override async upload(): Promise<void> { // {{{
	} // }}}
}
