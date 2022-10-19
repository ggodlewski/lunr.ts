import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { Pipeline } from '../src/Pipeline.ts';
import { trimmer } from '../src/trimmer.ts';
import { Token } from '../src/Token.ts';

describe('trimmer', function () {
	it('latin characters', function () {
		const token = new Token('hello');
		assertEquals(trimmer(token).toString(), token.toString());
	});

	describe('punctuation', function () {
		const trimmerTest = function (
			description: string,
			str: string,
			expected: string,
		) {
			it(description, function () {
				const token = new Token(str),
					trimmed = trimmer(token).toString();

				assertEquals(expected, trimmed);
			});
		};

		trimmerTest('full stop', 'hello.', 'hello');
		trimmerTest('inner apostrophe', 'it\'s', 'it\'s');
		trimmerTest('trailing apostrophe', 'james\'', 'james');
		trimmerTest('exclamation mark', 'stop!', 'stop');
		trimmerTest('comma', 'first,', 'first');
		trimmerTest('brackets', '[tag]', 'tag');
	});

	it('is a registered pipeline function', function () {
		assertEquals((<any> trimmer).label, 'trimmer');
		assertEquals(Pipeline.registeredFunctions['trimmer'], <any> trimmer);
	});
});
