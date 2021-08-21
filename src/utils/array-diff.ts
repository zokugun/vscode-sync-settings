export function arrayDiff(original: any[], modified: any[], hasher?: (data: any) => string): any[] {
	if(hasher) {
		const rest = new Set<string>(modified.map((value: any) => hasher(value)));
		return original.filter((element) => !rest.has(hasher(element)));
	}
	else {
		const rest = new Set<any>(modified);
		return original.filter((element) => !rest.has(element));
	}
}
