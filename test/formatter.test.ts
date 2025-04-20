import { expect } from 'chai';
import { formatter } from '../src/utils/formatter.js';

describe('formatter', () => {
	it('profile', () => { // {{{
		expect(formatter('profile({{profile}})', {
			profile: 'test',
		})).to.eql('profile(test)');
	}); // }}}

	it('date:iso', () => { // {{{
		const now = new Date();

		expect(formatter('update -- {{now|date:iso}}', {
			now,
		})).to.eql(`update -- ${now.toISOString()}`);
	}); // }}}

	it('date:styles', () => { // {{{
		const now = new Date();
		const formater = new Intl.DateTimeFormat('fr', {
			dateStyle: 'full',
			timeStyle: 'full',
		});

		expect(formatter('update -- {{now|date:full,full:fr}}', {
			now,
		})).to.eql(`update -- ${formater.format(now)}`);
	}); // }}}

	it('2vars', () => { // {{{
		const now = new Date();

		expect(formatter('profile({{profile}}): update -- {{now|date:iso}}', {
			profile: 'test',
			now,
		})).to.eql(`profile(test): update -- ${now.toISOString()}`);
	}); // }}}
});
