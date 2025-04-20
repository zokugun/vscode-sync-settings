import { type ExtensionId } from '../repository.js';

export function sortExtensionList(list: ExtensionId[]): ExtensionId[] {
	return list.sort((a, b) => a.id.localeCompare(b.id));
}
