import { expect } from 'chai';
import { format } from '../src/utils/format';

describe('format', () => {
	it('profile', () => { // {{{
		expect(format('profile({{profile}})', {
			profile: 'test',
		})).to.eql('profile(test)');
	}); // }}}

	it('date:iso', () => { // {{{
		const now = new Date();

		expect(format('update -- {{now|date:iso}}', {
			now,
		})).to.eql(`update -- ${now.toISOString()}`);
	}); // }}}

	it('date:styles', () => { // {{{
		const now = new Date();
		const formater = new Intl.DateTimeFormat('fr', {
			dateStyle: 'full',
			timeStyle: 'full',
		});

		expect(format('update -- {{now|date:full,full:fr}}', {
			now,
		})).to.eql(`update -- ${formater.format(now)}`);
	}); // }}}

	it('2vars', () => { // {{{
		const now = new Date();

		expect(format('profile({{profile}}): update -- {{now|date:iso}}', {
			profile: 'test',
			now,
		})).to.eql(`profile(test): update -- ${now.toISOString()}`);
	}); // }}}
});
