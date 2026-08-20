import detectNewline from 'detect-newline';
import { type JSONVisitor, visit } from 'jsonc-parser';

export function insertProperties(text: string, properties: string): string {
	if(properties.length === 0) {
		return text;
	}

	const newLine = detectNewline(text) ?? '\n';

	let endOffset = -1;
	let separated = false;
	let level = -1;

	const visitor: JSONVisitor = {
		onArrayBegin() {
			level += 1;
		},
		onArrayEnd() {
			level -= 1;
			separated = false;
		},
		onObjectBegin() {
			level += 1;
		},
		onObjectEnd(offset: number) {
			if(level === 0) {
				endOffset = offset;
			}
			else {
				separated = false;
			}

			level -= 1;
		},
		onObjectProperty() {
			separated = false;
		},
		onSeparator() {
			separated = true;
		},
	};

	visit(text, visitor);

	if(endOffset === -1) {
		return text;
	}
	else {
		let result = text.slice(0, endOffset);

		if(!separated) {
			result += `${newLine},${newLine}`;
		}

		result += properties;
		result += text.slice(endOffset);

		return result;
	}
}
