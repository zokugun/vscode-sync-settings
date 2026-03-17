const VARIABLE_REGEX = /{{([a-z]+)(?:\|([a-z]+)(?::([\w,-]+))?(?::([\w,-]+))?)?}}/g;
const DATE_STYLES = ['full', 'long', 'medium', 'short'] as const;

type DateStyle = typeof DATE_STYLES[number];

function isDateStyle(value: string): value is DateStyle {
	return (DATE_STYLES as readonly string[]).includes(value);
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
	const options: Intl.DateTimeFormatOptions = {};
	const [dateStyle, timeStyle] = styleParameter.split(',');

	if(isDateStyle(dateStyle)) {
		options.dateStyle = dateStyle;
	}

	if(isDateStyle(timeStyle)) {
		options.timeStyle = timeStyle;
	}

	const formatter = new Intl.DateTimeFormat(locales, options);

	return formatter.format(date);
}

export function formatter(format: string, properties: Record<string, unknown>): string {
	let match = VARIABLE_REGEX.exec(format);
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
		match = VARIABLE_REGEX.exec(format);
	}

	result += format.slice(index, format.length);

	return result;
}
