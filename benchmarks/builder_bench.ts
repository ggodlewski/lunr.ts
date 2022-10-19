import { Builder } from '../src/Builder.ts';
import { lunr } from '../src/lunr.ts';

const documents = [{
	id: 'a',
	title: 'Mr. Green kills Colonel Mustard',
	body:
		'Mr. Green killed Colonel Mustard in the study with the candlestick. Mr. Green is not a very nice fellow.',
	wordCount: 19,
}, {
	id: 'b',
	title: 'Plumb waters plant',
	body: 'Professor Plumb has a green plant in his study',
	wordCount: 9,
}, {
	id: 'c',
	title: 'Scarlett helps Professor',
	body:
		'Miss Scarlett watered Professor Plumbs green plant while he was away from his office last week.',
	wordCount: 16,
}];

Deno.bench('Builder', () => {
	lunr((builder: Builder) => {
		builder.ref('id');
		builder.field('title');
		builder.field('body');

		for (const doc of documents) {
			builder.add(doc);
		}
	});
});
