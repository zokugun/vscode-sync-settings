// eslint-disable-next-line ts/no-unnecessary-type-parameters
export function safeCast<T>(value: unknown): T {
	// eslint-disable-next-line ts/no-unsafe-type-assertion
	return value as T;
}
