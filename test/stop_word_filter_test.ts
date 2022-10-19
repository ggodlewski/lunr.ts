import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertEquals,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { stopWordFilter } from '../src/stopWordFilter.ts';
import { Pipeline } from '../src/Pipeline.ts';

describe('stopWordFilter', function () {
	it('filters stop words', function () {
		const stopWords = ['the', 'and', 'but', 'than', 'when'];

		stopWords.forEach(function (word) {
			assert('undefined' === typeof stopWordFilter(word));
		});
	});

	it('ignores non stop words', function () {
		const nonStopWords = ['interesting', 'words', 'pass', 'through'];

		nonStopWords.forEach(function (word) {
			assertEquals(word, stopWordFilter(word));
		});
	});

	it('ignores properties of Object.prototype', function () {
		const nonStopWords = [
			'constructor',
			'hasOwnProperty',
			'toString',
			'valueOf',
		];

		nonStopWords.forEach(function (word) {
			assertEquals(word, stopWordFilter(word));
		});
	});

	it('is a registered pipeline function', function () {
		assertEquals('stopWordFilter', (<any> stopWordFilter).label);
		assertEquals(
			stopWordFilter,
			Pipeline.registeredFunctions['stopWordFilter'],
		);
	});
});
