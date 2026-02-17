export type IDisposable = {
	dispose(): void;
};

export function dispose<T extends IDisposable>(disposables: T[]): T[] {
	for(const d of disposables) {
		d.dispose();
	}

	return [];
}
