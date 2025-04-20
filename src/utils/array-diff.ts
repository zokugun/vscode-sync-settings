export function arrayDiff<T>(original: T[], modified: T[], hasher?: (data: T) => string): T[] {
	if(hasher) {
		const rest = new Set<string>(modified.map((value: T) => hasher(value)));
		return original.filter((element) => !rest.has(hasher(element)));
	}
	else {
		const rest = new Set<any>(modified);
		return original.filter((element) => !rest.has(element));
	}
}
