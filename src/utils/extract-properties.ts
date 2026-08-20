import detectNewline from 'detect-newline';
import { type JSONVisitor, visit } from 'jsonc-parser';

export function extractProperties(text: string, properties: string[]): string {
	if(properties.length === 0) {
		return '';
	}

	const newLine = detectNewline(text) ?? '\n';

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
		onArrayEnd() {
			level -= 1;
		},
		onComment(offset, length) {
			if(/^\/\/\s*#ignore/.test(text.slice(offset, offset + length))) {
				let from = offset;
				let c: number | undefined;

				while((c = text.codePointAt(from - 1)) === 9 || c === 32) {
					from -= 1;
				}

				matches.unshift({ from, until: from + length });

				match = true;
			}
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
		onObjectEnd() {
			level -= 1;
		},
		onObjectProperty(name, offset, length) {
			if(level === 0 && properties.includes(name)) {
				let from = offset;
				let c: number | undefined;

				while((c = text.codePointAt(from - 1)) === 9 || c === 32) {
					from -= 1;
				}

				matches.unshift({ from, until: from + length });

				match = true;
			}
		},
		onSeparator(character, offset, length) {
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
