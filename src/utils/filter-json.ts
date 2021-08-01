import { visit } from 'jsonc-parser';

export function filterJSON(text: string, ignored: string[]): string {
	const matches: Array<{ from: number; until: number }> = [];

	let level = -1;
	let match = false;

	const visitor = {
		onArrayBegin: (offset: number, length: number) => {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}

			++level;
		},
		onArrayEnd: () => {
			--level;
		},
		onLiteralValue: (_: any, offset: number, length: number) => {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}
		},
		onObjectBegin: (offset: number, length: number) => {
			if(level === 0 && match) {
				matches[0].until = offset + length;
			}

			++level;
		},
		onObjectProperty: (name: string, offset: number, length: number) => {
			if(level === 0 && ignored.includes(name)) {
				matches.unshift({ from: offset, until: offset + length });

				match = true;
			}
		},
		onObjectEnd: () => {
			--level;
		},
		onSeparator: (character: string, offset: number, length: number) => {
			if(level === 0 && match && character === ',') {
				matches[0].until = offset + length;

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
