import { Token } from '../src/Token.ts';
import { stemmer } from '../src/stemmer.ts';
import { words } from './words.ts';

Deno.bench('stemmer', () => {
	for (const word of words) {
		stemmer(new Token(word));
	}
});
