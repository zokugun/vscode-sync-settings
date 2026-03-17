const $regex = /{{([a-z]+)(?:\|([a-z]+)(?::([a-z,]+))?(?::([a-z,]+))?)?}}/g;

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
			const date = properties[match[1]] as Date;

			if(!match[3]) {
				result += String(date);
			}
			else if(match[3] === 'iso') {
				result += date.toISOString();
			}
			else {
				const locales = match[4] ? match[4].split(',') : undefined;
				const options: {
					dateStyle?: 'full' | 'long' | 'medium' | 'short' | undefined;
					timeStyle?: 'full' | 'long' | 'medium' | 'short' | undefined;
				} = {
					dateStyle: undefined,
					timeStyle: undefined,
				};

				const [dateStyle, timeStyle] = match[3].split(',');

				if(dateStyle === 'full' || dateStyle === 'long' || dateStyle === 'medium' || dateStyle === 'short') {
					options.dateStyle = dateStyle;
				}

				if(timeStyle === 'full' || timeStyle === 'long' || timeStyle === 'medium' || timeStyle === 'short') {
					options.timeStyle = timeStyle;
				}

				const formatter = new Intl.DateTimeFormat(locales, options);

				result += formatter.format(date);
			}
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
