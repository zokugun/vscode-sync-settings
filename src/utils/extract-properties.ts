import { visit } from 'jsonc-parser';
import detectNewline from 'detect-newline';

export function extractProperties(text: string, properties: string[]): string {
	if(properties.length === 0) {
		return '';
	}

	const newLine = detectNewline(text) ?? '\n';

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
		onComment: (offset: number, length: number) => {
			if(/^\/\/\s*#ignore/.test(text.slice(offset, offset + length))) {
				let c;
				while((c = text.charCodeAt(offset - 1)) === 9 || c === 32) {
					--offset;
				}

				matches.unshift({ from: offset, until: offset + length });

				match = true;
			}
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
			if(level === 0 && properties.includes(name)) {
				let c;
				while((c = text.charCodeAt(offset - 1)) === 9 || c === 32) {
					--offset;
				}

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

	let result = '';

	for(const { from, until } of matches) {
		result += text.slice(from, until) + newLine;
	}

	return result;
}
