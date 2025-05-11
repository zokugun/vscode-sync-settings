import { visit } from 'jsonc-parser';

export function removeProperties(text: string, properties: string[]): string {
	if(properties.length === 0) {
		return text;
	}

	const matches: Array<{ from: number; until: number }> = [];

	let level = -1;
	let match = false;

	const visitor = {
		onArrayBegin(offset: number, length: number) {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}

			++level;
		},
		onArrayEnd(offset: number, length: number) {
			--level;
		},
		onLiteralValue(_: any, offset: number, length: number) {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}
		},
		onObjectBegin(offset: number, length: number) {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}

			++level;
		},
		onObjectProperty(name: string, offset: number, length: number) {
			if(level === 0 && properties.includes(name)) {
				const until = offset + length;

				let c;
				while((c = text.codePointAt(offset - 1)) === 9 || c === 32) {
					--offset;
				}

				matches.unshift({ from: offset, until });

				match = true;
			}
		},
		onObjectEnd(offset: number, length: number) {
			--level;

			if(level === -1 && match) {
				matches[0].until = offset;

				match = false;
			}
		},
		onSeparator(character: string, offset: number, length: number) {
			if(level === 0 && match && character === ',') {
				let until = offset + length - 1;

				let c;
				while((c = text.codePointAt(until + 1)) === 9 || c === 32 || c === 10 || c === 13) {
					++until;

					if(c === 10) {
						break;
					}
					else if(c === 13 && text.codePointAt(until + 1) === 10) {
						++until;
					}
				}

				matches[0].until = until + 1;

				match = false;
			}
		},
	};

	visit(text, visitor);

	for(const { from, until } of matches) {
		text = text.slice(0, from) + text.slice(until);
	}

	return text;
}
