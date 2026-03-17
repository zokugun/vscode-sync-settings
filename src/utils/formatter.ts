const $regex = /{{(\w+)(?:\|([a-z]+)(?::([\w,-]+))?(?::([\w,-]+))?)?}}/g;

type DateStyle = 'full' | 'long' | 'medium' | 'short';

const DATE_STYLES = new Set<string>(['full', 'long', 'medium', 'short']);

function isDateStyle(value: string): value is DateStyle {
	return DATE_STYLES.has(value);
}

function resolveLocales(raw: string | undefined): string[] | undefined {
	if(!raw || raw === 'local') {
		return undefined;
	}

	return raw.split(',');
}

function formatDate(date: Date, styleParameter: string | undefined, localeParameter: string | undefined): string {
	if(!styleParameter) {
		return String(date);
	}

	if(styleParameter === 'iso') {
		return date.toISOString();
	}

	const locales = resolveLocales(localeParameter);
	const styles = styleParameter.split(',');
	const options: Intl.DateTimeFormatOptions = {};

	if(isDateStyle(styles[0])) {
		options.dateStyle = styles[0];
	}

	if(styles.length > 1 && isDateStyle(styles[1])) {
		options.timeStyle = styles[1];
	}

	return new Intl.DateTimeFormat(locales, options).format(date);
}

export function formatter(format: string, properties: Record<string, unknown>): string {
	let match = $regex.exec(format);
	if(!match) {
		return format;
	}

	let result = '';
	let index = 0;

	while(match) {
		if(match.index > index) {
			result += format.slice(index, match.index);
		}

		if(match[2] === 'date') {
			result += formatDate(properties[match[1]] as Date, match[3], match[4]);
		}
		else {
			result += String(properties[match[1]]);
		}

		index = match.index + match[0].length;
		match = $regex.exec(format);
	}

	result += format.slice(index, format.length);

	return result;
}
