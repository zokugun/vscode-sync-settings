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

	it('date:dateStyle only', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(now);

		expect(formatter('{{now|date:medium}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:dateStyle,timeStyle', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'full',
			timeStyle: 'short',
		}).format(now);

		expect(formatter('{{now|date:full,short}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:styles with zh-CN locale', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat('zh-CN', {
			dateStyle: 'long',
			timeStyle: 'medium',
		}).format(now);

		expect(formatter('{{now|date:long,medium:zh-CN}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:styles with multiple locales', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(['en-US', 'zh-CN'], {
			dateStyle: 'short',
		}).format(now);

		expect(formatter('{{now|date:short:en-US,zh-CN}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:local keyword uses system locale', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'long',
		}).format(now);

		expect(formatter('{{now|date:long:local}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date without style falls back to String()', () => { // {{{
		const now = new Date();

		expect(formatter('{{now|date}}', {
			now,
		})).to.eql(String(now));
	}); // }}}

	it('2vars', () => { // {{{
		const now = new Date();

		expect(formatter('profile({{profile}}): update -- {{now|date:iso}}', {
			profile: 'test',
			now,
		})).to.eql(`profile(test): update -- ${now.toISOString()}`);
	}); // }}}
});
