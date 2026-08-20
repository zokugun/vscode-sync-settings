import type { ExtensionList } from '../repository';

export function applyExtensionsDiff({ builtin, disabled, enabled }: ExtensionList, diff: ExtensionList): ExtensionList {
	for(const extension of diff.disabled) {
		const index = enabled.findIndex((item) => item.id === extension.id);
		if(index !== -1) {
			enabled.splice(index, 1);
		}

		if(!disabled.some((item) => item.id === extension.id)) {
			disabled.push(extension);
		}
	}

	for(const extension of diff.enabled) {
		const index = disabled.findIndex((item) => item.id === extension.id);
		if(index !== -1) {
			disabled.splice(index, 1);
		}

		if(!enabled.some((item) => item.id === extension.id)) {
			enabled.push(extension);
		}
	}

	if(diff.uninstall) {
		for(const { id } of diff.uninstall) {
			const index = disabled.findIndex((item) => item.id === id);
			if(index === -1) {
				const index = enabled.findIndex((item) => item.id === id);
				if(index !== -1) {
					enabled.splice(index, 1);
				}
			}
			else {
				disabled.splice(index, 1);
			}
		}
	}

	if(builtin) {
		builtin.disabled ??= [];
		builtin.enabled ??= [];

		for(const id of diff.builtin!.disabled!) {
			const index = builtin.enabled.indexOf(id);
			if(index !== -1) {
				builtin.enabled.splice(index, 1);
			}

			if(!builtin.disabled.includes(id)) {
				builtin.disabled.push(id);
			}
		}

		for(const id of diff.builtin!.enabled!) {
			const index = builtin.disabled.indexOf(id);
			if(index !== -1) {
				builtin.disabled.splice(index, 1);
			}

			if(!builtin.enabled.includes(id)) {
				builtin.enabled.push(id);
			}
		}
	}
	else {
		({ builtin } = diff);
	}

	return {
		builtin,
		disabled,
		enabled,
	};
}
