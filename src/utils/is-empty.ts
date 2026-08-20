export function isEmpty(object: Record<string, unknown>): boolean {
	for(const key in object) {
		if(Object.hasOwn(object, key)) {
			return false;
		}
	}

	return true;
}
