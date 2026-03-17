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

	it('date:full,full:fr', () => { // {{{
		const now = new Date();
		const formater = new Intl.DateTimeFormat('fr', {
			dateStyle: 'full',
			timeStyle: 'full',
		});

		expect(formatter('update -- {{now|date:full,full:fr}}', {
			now,
		})).to.eql(`update -- ${formater.format(now)}`);
	}); // }}}

	it('date:medium', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(now);

		expect(formatter('{{now|date:medium}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:full,short', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'full',
			timeStyle: 'short',
		}).format(now);

		expect(formatter('{{now|date:full,short}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:long,medium:zh-CN', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat('zh-CN', {
			dateStyle: 'long',
			timeStyle: 'medium',
		}).format(now);

		expect(formatter('{{now|date:long,medium:zh-CN}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:short:en-US,zh-CN', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(['en-US', 'zh-CN'], {
			dateStyle: 'short',
		}).format(now);

		expect(formatter('{{now|date:short:en-US,zh-CN}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date:long:local', () => { // {{{
		const now = new Date();
		const expected = new Intl.DateTimeFormat(undefined, {
			dateStyle: 'long',
		}).format(now);

		expect(formatter('{{now|date:long:local}}', {
			now,
		})).to.eql(expected);
	}); // }}}

	it('date!', () => { // {{{
		const now = new Date();

		expect(formatter('{{now|date}}', {
			now,
		})).to.eql(String(now));
	}); // }}}

	it('variables - 2', () => { // {{{
		const now = new Date();

		expect(formatter('profile({{profile}}): update -- {{now|date:iso}}', {
			profile: 'test',
			now,
		})).to.eql(`profile(test): update -- ${now.toISOString()}`);
	}); // }}}
});
