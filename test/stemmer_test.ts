import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { stemmer } from '../src/stemmer.ts';
import { Pipeline } from '../src/Pipeline.ts';
import { Token } from '../src/Token.ts';

import stemmingVocab from './fixtures/stemming_vocab.json' assert {
	type: 'json',
};
import { PipelineFunction } from '../src/PipelineFunction.ts';

describe('stemmer', function () {
	it('reduces words to their stem', function () {
		const testData: { [key: string]: string } = stemmingVocab;
		for (const word in testData) {
			const expected: string = testData[word];
			const token = new Token(word);
			const result = stemmer(token).toString();

			assertEquals(expected, result);
		}
	});

	it('is a registered pipeline function', function () {
		assertEquals('stemmer', (<PipelineFunction> stemmer).label);
		assertEquals(stemmer, Pipeline.registeredFunctions['stemmer']);
	});
});
