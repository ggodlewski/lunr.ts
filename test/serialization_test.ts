import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { lunr } from '../src/lunr.ts';
import { LunrIndex } from '../src/LunrIndex.ts';
import { Builder } from '../src/Builder.ts';

describe('serialization', function () {
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
	}, {
		id: 'd',
		title: 'All about JavaScript',
		body: 'JavaScript objects have a special __proto__ property',
		wordCount: 7,
	}];

	const idx = lunr(function (builder: Builder) {
		builder.ref('id');
		builder.field('title');
		builder.field('body');

		for (const document of documents) {
			builder.add(document);
		}
	});

	const serializedIdx = JSON.stringify(idx);
	const loadedIdx = LunrIndex.load(JSON.parse(serializedIdx));

	it('search', function () {
		const idxResults = idx.search('green'),
			serializedResults = loadedIdx.search('green');

		assertEquals(idxResults, serializedResults);
	});

	it('__proto__ double serialization', function () {
		const doubleLoadedIdx = LunrIndex.load(
				JSON.parse(JSON.stringify(loadedIdx)),
			),
			idxResults = idx.search('__proto__'),
			doubleSerializedResults = doubleLoadedIdx.search('__proto__');

		assertEquals(idxResults, doubleSerializedResults);
	});
});
