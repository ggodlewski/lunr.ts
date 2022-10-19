import { Builder } from '../src/Builder.ts';
import { lunr } from '../src/lunr.ts';
import { Query, QueryWildCard } from '../src/Query.ts';

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

const idx = lunr((builder: Builder) => {
	builder.ref('id');
	builder.field('title');
	builder.field('body');

	for (const doc of documents) {
		builder.add(doc);
	}
});

Deno.bench('single term', { group: 'search' }, () => {
	idx.search('green');
});

Deno.bench('multi term', { group: 'search' }, () => {
	idx.search('green plant');
});

Deno.bench('trailing wildcard', { group: 'search' }, () => {
	idx.search('pl*');
});

Deno.bench('leading wildcard', { group: 'search' }, () => {
	idx.search('*ant');
});

Deno.bench('contained wildcard', { group: 'search' }, () => {
	idx.search('p*t');
});

Deno.bench('with field', { group: 'search' }, () => {
	idx.search('title:plant');
});

Deno.bench('edit distance', { group: 'search' }, () => {
	idx.search('plint~2');
});

Deno.bench('typeahead', { group: 'search' }, () => {
	idx.query(function (q: Query) {
		q.term('pl', { boost: 100, usePipeline: true });
		q.term('pl', {
			boost: 10,
			usePipeline: false,
			wildcard: QueryWildCard.TRAILING,
		});
		q.term('pl', { boost: 1, editDistance: 1 });
	});
});

Deno.bench('negated query', { group: 'search' }, () => {
	idx.search('-plant');
});

Deno.bench('required term', { group: 'search' }, () => {
	idx.search('green +plant');
});
