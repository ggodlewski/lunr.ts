import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { tokenizer } from '../src/tokenizer.ts';
import { assertSameMembers } from './utils.ts';

const toString = function (o: any): string {
	return o.toString();
};

describe('tokenizer', function () {
	it('splitting into tokens', function () {
		const tokens = tokenizer('foo bar baz')
			.map(toString);

		assertSameMembers(['foo', 'bar', 'baz'], tokens);
	});

	it('downcases tokens', function () {
		const tokens = tokenizer('Foo BAR BAZ')
			.map(toString);

		assertSameMembers(['foo', 'bar', 'baz'], tokens);
	});

	it('array of strings', function () {
		const tokens = tokenizer(['foo', 'bar', 'baz'])
			.map(toString);

		assertSameMembers(['foo', 'bar', 'baz'], tokens);
	});

	it('undefined is converted to empty string', function () {
		const tokens = tokenizer(['foo', undefined, 'baz'])
			.map(toString);

		assertSameMembers(['foo', '', 'baz'], tokens);
	});

	it('null is converted to empty string', function () {
		const tokens = tokenizer(['foo', null, 'baz'])
			.map(toString);

		assertSameMembers(['foo', '', 'baz'], tokens);
	});

	it('multiple white space is stripped', function () {
		const tokens = tokenizer('   foo    bar   baz  ')
			.map(toString);

		assertSameMembers(['foo', 'bar', 'baz'], tokens);
	});

	it('handling null-like arguments', function () {
		assertEquals(tokenizer().length, 0);
		assertEquals(tokenizer(undefined).length, 0);
		assertEquals(tokenizer(null).length, 0);
	});

	it('converting a date to tokens', function () {
		const date = new Date(Date.UTC(2013, 0, 1, 12));

		// NOTE: slicing here to prevent asserting on parts
		// of the date that might be affected by the timezone
		// the test is running in.
		assertSameMembers(
			['tue', 'jan', '01', '2013'],
			tokenizer(date).slice(0, 4).map(toString),
		);
	});

	it('converting a number to tokens', function () {
		assertEquals('41', tokenizer(41).map(toString).join(''));
	});

	it('converting a boolean to tokens', function () {
		assertEquals('false', tokenizer(false).map(toString).join(''));
	});

	it('converting an object to tokens', function () {
		const obj = {
			toString: function () {
				return 'custom object';
			},
		};

		assertSameMembers(tokenizer(obj).map(toString), ['custom', 'object']);
	});

	it('splits strings with hyphens', function () {
		assertSameMembers(tokenizer('foo-bar').map(toString), ['foo', 'bar']);
	});

	it('splits strings with hyphens and spaces', function () {
		assertSameMembers(tokenizer('foo - bar').map(toString), ['foo', 'bar']);
	});

	it('tracking the token index', function () {
		const tokens = tokenizer('foo bar');
		assertEquals(tokens[0].metadata.index, 0);
		assertEquals(tokens[1].metadata.index, 1);
	});

	it('tracking the token position', function () {
		const tokens = tokenizer('foo bar');
		assertEquals(tokens[0].metadata.position, [0, 3]);
		assertEquals(tokens[1].metadata.position, [4, 3]);
	});

	it('tracking the token position with additional left-hand whitespace', function () {
		const tokens = tokenizer(' foo bar');
		assertEquals(tokens[0].metadata.position, [1, 3]);
		assertEquals(tokens[1].metadata.position, [5, 3]);
	});

	it('tracking the token position with additional right-hand whitespace', function () {
		const tokens = tokenizer('foo bar ');
		assertEquals(tokens[0].metadata.position, [0, 3]);
		assertEquals(tokens[1].metadata.position, [4, 3]);
	});

	it('providing additional metadata', function () {
		const tokens = tokenizer('foo bar', { 'hurp': 'durp' });
		assertEquals(tokens[0].metadata.hurp, 'durp');
		assertEquals(tokens[1].metadata.hurp, 'durp');
	});
});
