import type { ExtensionList, ExtensionId } from '../repository.js';

export function sortExtensionsById(list: ExtensionId[]): ExtensionId[] {
	return list.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Sorts an ExtensionList by extension IDs in ascending order.
 * Does not mutate the original ExtensionList; returns a new sorted instance.
 */
export function sortExtensionList(extensionList: ExtensionList): ExtensionList {
	const cloned = structuredClone(extensionList);
	if(cloned.builtin) {
		cloned.builtin.disabled &&= cloned.builtin.disabled.sort((a, b) => a.localeCompare(b));
		cloned.builtin.enabled &&= cloned.builtin.enabled.sort((a, b) => a.localeCompare(b));
	}

	cloned.disabled = sortExtensionsById(cloned.disabled);
	cloned.enabled = sortExtensionsById(cloned.enabled);
	cloned.uninstall &&= sortExtensionsById(cloned.uninstall);
	return cloned;
}
