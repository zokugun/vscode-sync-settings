export function isEmpty(object: Record<string, unknown>) {
	for(const key in object) {
		// eslint-disable-next-line no-prototype-builtins
		if(object.hasOwnProperty(key)) {
			return false;
		}
	}

	return true;
}
