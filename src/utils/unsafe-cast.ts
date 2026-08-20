// eslint-disable-next-line ts/no-unnecessary-type-parameters
export function unsafeCast<T>(value: unknown): T {
	// eslint-disable-next-line ts/no-unsafe-type-assertion
	return value as T;
}
