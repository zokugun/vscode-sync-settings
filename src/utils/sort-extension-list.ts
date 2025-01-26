import { ExtensionId } from '../repository';

export function sortExtensionList(list: ExtensionId[]): ExtensionId[] {
	return list.sort((a, b) => a.id.localeCompare(b.id));
}
