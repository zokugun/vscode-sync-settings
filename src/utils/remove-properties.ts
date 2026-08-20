import { type JSONVisitor, visit } from 'jsonc-parser';

export function removeProperties(text: string, properties: string[]): string {
	if(properties.length === 0) {
		return text;
	}

	const matches: Array<{ from: number; until: number }> = [];

	let level = -1;
	let match = false;

	const visitor: JSONVisitor = {
		onArrayBegin(offset, length) {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}

			level += 1;
		},
		onArrayEnd(_offset, _length) {
			level -= 1;
		},
		onLiteralValue(_value, offset, length) {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}
		},
		onObjectBegin(offset, length) {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}

			level += 1;
		},
		onObjectEnd(offset, _length) {
			level -= 1;

			if(level === -1 && match) {
				matches[0].until = offset;

				match = false;
			}
		},
		onObjectProperty(name, offset, length) {
			if(level === 0 && properties.includes(name)) {
				let from = offset;
				const until = offset + length;

				let c: number | undefined;

				while((c = text.codePointAt(from - 1)) === 9 || c === 32) {
					from -= 1;
				}

				matches.unshift({ from, until });

				match = true;
			}
		},
		onSeparator(character, offset, length) {
			if(level === 0 && match && character === ',') {
				let until = offset + length - 1;

				let c: number | undefined;

				while((c = text.codePointAt(until + 1)) === 9 || c === 32 || c === 10 || c === 13) {
					until += 1;

					if(c === 10) {
						break;
					}
					else if(c === 13 && text.codePointAt(until + 1) === 10) {
						until += 1;
					}
				}

				matches[0].until = until + 1;

				match = false;
			}
		},
	};

	visit(text, visitor);

	let result = text;

	for(const { from, until } of matches) {
		result = text.slice(0, from) + text.slice(until);
	}

	return result;
}
