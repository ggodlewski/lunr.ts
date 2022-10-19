import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertEquals,
	assertThrows,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import {
	assertDoesNotThrow,
	assertLengthOf,
	assertSameMembers,
} from './utils.ts';
import { lunr } from '../src/lunr.ts';
import { Query, QueryWildCard } from '../src/Query.ts';
import { DocMatch } from '../src/LunrIndex.ts';
import { QueryParseError } from '../src/QueryParseError.ts';
import { Builder } from '../src/Builder.ts';

describe('search', function () {
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

	describe('with build-time field boosts', function () {
		const idx = lunr((builder: Builder) => {
			builder.ref('id');
			builder.field('title');
			builder.field('body', { boost: 10 });

			for (const document of documents) {
				builder.add(document);
			}
		});

		describe('no query boosts', function () {
			let results;

			const assertions = function (results: DocMatch[]) {
				it('document b ranks highest', function () {
					assertEquals('b', results[0].ref);
				});
			};

			describe('#search', function () {
				results = idx.search('professor');

				assertions(results);
			});

			describe('#query', function () {
				results = idx.query(function (q: Query) {
					q.term('professor');
				});

				assertions(results);
			});
		});
	});

	describe('with build-time document boost', function () {
		const idx = lunr(function (builder: Builder) {
			builder.ref('id');
			builder.field('title');
			builder.field('body');

			for (const document of documents) {
				const boost = document.id === 'c' ? 10 : 1;
				builder.add(document, { boost: boost });
			}
		});

		describe('no query boost', function () {
			let results;

			const assertions = function (results: DocMatch[]) {
				it('document c ranks highest', function () {
					assertEquals('c', results[0].ref);
				});
			};

			describe('#search', function () {
				results = idx.search('plumb');

				assertions(results);
			});

			describe('#query', function () {
				results = idx.query(function (q: Query) {
					q.term('plumb');
				});

				assertions(results);
			});
		});

		describe('with query boost', function () {
			let results;

			const assertions = function (results: DocMatch[]) {
				it('document b ranks highest', function () {
					assertEquals('b', results[0].ref);
				});
			};

			describe('#search', function () {
				results = idx.search('green study^10');

				assertions(results);
			});

			describe('#query', function () {
				results = idx.query(function (q: Query) {
					q.term('green');
					q.term('study', { boost: 10 });
				});

				assertions(results);
			});
		});
	});

	describe('without build-time boosts', function () {
		const idx = lunr((builder: Builder) => {
			builder.ref('id');
			builder.field('title');
			builder.field('body');

			for (const document of documents) {
				builder.add(document);
			}
		});

		describe('single term search', function () {
			describe('one match', function () {
				const assertions = function (results: DocMatch[]) {
					it('one result returned', function () {
						assertLengthOf(results, 1);
					});

					it('document c matches', function () {
						assertEquals('c', results[0].ref);
					});

					it('matching term', function () {
						assertSameMembers(
							['scarlett'],
							Object.keys(results[0].matchData.metadata),
						);
					});
				};

				describe('#seach', function () {
					const results = idx.search('scarlett');

					assertions(results);
				});

				describe('#query', function () {
					const results = idx.query(function (q: Query) {
						q.term('scarlett');
					});

					assertions(results);
				});
			});

			describe('no match', function () {
				const results = idx.search('foo');

				it('no matches', function () {
					assertLengthOf(results, 0);
				});
			});

			describe('multiple matches', function () {
				const results = idx.search('plant');

				it('has two matches', function () {
					assertLengthOf(results, 2);
				});

				it('sorted by relevance', function () {
					assertEquals('b', results[0].ref);
					assertEquals('c', results[1].ref);
				});
			});

			describe('pipeline processing', function () {
				// study would be stemmed to studi, tokens
				// are stemmed by default on index and must
				// also be stemmed on search to match
				describe('enabled (default)', function () {
					const results = idx.query(function (q: Query) {
						q.clause({ term: 'study', usePipeline: true });
					});

					it('has two matches', function () {
						assertLengthOf(results, 2);
					});

					it('sorted by relevance', function () {
						assertEquals('b', results[0].ref);
						assertEquals('a', results[1].ref);
					});
				});

				describe('disabled', function () {
					const results = idx.query(function (q: Query) {
						q.clause({ term: 'study', usePipeline: false });
					});

					it('no matches', function () {
						assertLengthOf(results, 0);
					});
				});
			});
		});

		describe('multiple terms', function () {
			describe('all terms match', function () {
				const results = idx.search('fellow candlestick');

				it('has one match', function () {
					assertLengthOf(results, 1);
				});

				it('correct document returned', function () {
					assertEquals('a', results[0].ref);
				});

				it('matched terms returned', function () {
					assertSameMembers(
						['fellow', 'candlestick'],
						Object.keys(results[0].matchData.metadata),
					);
					assertSameMembers(
						['body'],
						Object.keys(
							results[0].matchData.metadata['fellow'],
						),
					);
					assertSameMembers(
						['body'],
						Object.keys(
							results[0].matchData.metadata['candlestick'],
						),
					);
				});
			});

			describe('one term matches', function () {
				const results = idx.search('week foo');

				it('has one match', function () {
					assertLengthOf(results, 1);
				});

				it('correct document returned', function () {
					assertEquals('c', results[0].ref);
				});

				it('only matching terms returned', function () {
					assertSameMembers(
						['week'],
						Object.keys(results[0].matchData.metadata),
					);
				});
			});

			describe('duplicate query terms', function () {
				// https://github.com/olivernn/lunr.js/issues/256
				// previously this would throw a duplicate index error
				// because the query vector already contained an entry
				// for the term 'fellow'
				it('no errors', function () {
					assertDoesNotThrow(function () {
						idx.search(
							'fellow candlestick foo bar green plant fellow',
						);
					});
				});
			});

			describe('documents with all terms score higher', function () {
				const results = idx.search('candlestick green');

				it('has three matches', function () {
					assertLengthOf(results, 3);
				});

				it('correct documents returned', function () {
					const matchingDocuments = results.map(function (r) {
						return r.ref;
					});
					assertSameMembers(['a', 'b', 'c'], matchingDocuments);
				});

				it('documents with all terms score highest', function () {
					assertEquals('a', results[0].ref);
				});

				it('matching terms are returned', function () {
					assertSameMembers(
						['candlestick', 'green'],
						Object.keys(results[0].matchData.metadata),
					);
					assertSameMembers(
						['green'],
						Object.keys(results[1].matchData.metadata),
					);
					assertSameMembers(
						['green'],
						Object.keys(results[2].matchData.metadata),
					);
				});
			});

			describe('no terms match', function () {
				const results = idx.search('foo bar');

				it('no matches', function () {
					assertLengthOf(results, 0);
				});
			});

			describe('corpus terms are stemmed', function () {
				const results = idx.search('water');

				it('matches two documents', function () {
					assertLengthOf(results, 2);
				});

				it('matches correct documents', function () {
					const matchingDocuments = results.map(function (r) {
						return r.ref;
					});
					assertSameMembers(['b', 'c'], matchingDocuments);
				});
			});

			describe('field scoped terms', function () {
				describe('only matches on scoped field', function () {
					const results = idx.search('title:plant');

					it('one result returned', function () {
						assertLengthOf(results, 1);
					});

					it('returns the correct document', function () {
						assertEquals('b', results[0].ref);
					});

					it('match data', function () {
						assertSameMembers(
							['plant'],
							Object.keys(results[0].matchData.metadata),
						);
					});
				});

				describe('no matching terms', function () {
					const results = idx.search('title:candlestick');

					it('no results returned', function () {
						assertLengthOf(results, 0);
					});
				});
			});

			describe('wildcard matching', function () {
				describe('trailing wildcard', function () {
					describe('no matches', function () {
						const results = idx.search('fo*');

						it('no results returned', function () {
							assertLengthOf(results, 0);
						});
					});

					describe('one match', function () {
						const results = idx.search('candle*');

						it('one result returned', function () {
							assertLengthOf(results, 1);
						});

						it('correct document matched', function () {
							assertEquals('a', results[0].ref);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['candlestick'],
								Object.keys(results[0].matchData.metadata),
							);
						});
					});

					describe('multiple terms match', function () {
						const results = idx.search('pl*');

						it('two results returned', function () {
							assertLengthOf(results, 2);
						});

						it('correct documents matched', function () {
							const matchingDocuments = results.map(
								function (r) {
									return r.ref;
								},
							);
							assertSameMembers(['b', 'c'], matchingDocuments);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['plumb', 'plant'],
								Object.keys(results[0].matchData.metadata),
							);
							assertSameMembers(
								['plumb', 'plant'],
								Object.keys(results[1].matchData.metadata),
							);
						});
					});
				});
			});
		});

		describe('wildcard matching', function () {
			describe('trailing wildcard', function () {
				describe('no matches found', function () {
					const results = idx.search('fo*');

					it('no results returned', function () {
						assertLengthOf(results, 0);
					});
				});

				describe('results found', function () {
					const results = idx.search('pl*');

					it('two results returned', function () {
						assertLengthOf(results, 2);
					});

					it('matching documents returned', function () {
						assertEquals('b', results[0].ref);
						assertEquals('c', results[1].ref);
					});

					it('matching terms returned', function () {
						assertSameMembers(
							['plant', 'plumb'],
							Object.keys(results[0].matchData.metadata),
						);
						assertSameMembers(
							['plant', 'plumb'],
							Object.keys(results[1].matchData.metadata),
						);
					});
				});
			});

			describe('leading wildcard', function () {
				describe('no results found', function () {
					const results = idx.search('*oo');

					it('no results found', function () {
						assertLengthOf(results, 0);
					});
				});

				describe('results found', function () {
					const results = idx.search('*ant');

					it('two results found', function () {
						assertLengthOf(results, 2);
					});

					it('matching documents returned', function () {
						assertEquals('b', results[0].ref);
						assertEquals('c', results[1].ref);
					});

					it('matching terms returned', function () {
						assertSameMembers(
							['plant'],
							Object.keys(results[0].matchData.metadata),
						);
						assertSameMembers(
							['plant'],
							Object.keys(results[1].matchData.metadata),
						);
					});
				});
			});

			describe('contained wildcard', function () {
				describe('no results found', function () {
					const results = idx.search('f*o');

					it('no results found', function () {
						assertLengthOf(results, 0);
					});
				});

				describe('results found', function () {
					const results = idx.search('pl*nt');

					it('two results found', function () {
						assertLengthOf(results, 2);
					});

					it('matching documents returned', function () {
						assertEquals('b', results[0].ref);
						assertEquals('c', results[1].ref);
					});

					it('matching terms returned', function () {
						assertSameMembers(
							['plant'],
							Object.keys(results[0].matchData.metadata),
						);
						assertSameMembers(
							['plant'],
							Object.keys(results[1].matchData.metadata),
						);
					});
				});
			});
		});

		describe('edit distance', function () {
			describe('no results found', function () {
				const results = idx.search('foo~1');

				it('no results returned', function () {
					assertLengthOf(results, 0);
				});
			});

			describe('results found', function () {
				const results = idx.search('plont~1');

				it('two results found', function () {
					assertLengthOf(results, 2);
				});

				it('matching documents returned', function () {
					assertEquals('b', results[0].ref);
					assertEquals('c', results[1].ref);
				});

				it('matching terms returned', function () {
					assertSameMembers(
						['plant'],
						Object.keys(results[0].matchData.metadata),
					);
					assertSameMembers(
						['plant'],
						Object.keys(results[1].matchData.metadata),
					);
				});
			});
		});

		describe('searching by field', function () {
			describe('unknown field', function () {
				it('throws QueryParseError', function () {
					assertThrows(
						function () {
							idx.search('unknown-field:plant');
						},
						QueryParseError,
					);
				});
			});

			describe('no results found', function () {
				const results = idx.search('title:candlestick');

				it('no results found', function () {
					assertLengthOf(results, 0);
				});
			});

			describe('results found', function () {
				const results = idx.search('title:plant');

				it('one results found', function () {
					assertLengthOf(results, 1);
				});

				it('matching documents returned', function () {
					assertEquals('b', results[0].ref);
				});

				it('matching terms returned', function () {
					assertSameMembers(
						['plant'],
						Object.keys(results[0].matchData.metadata),
					);
				});
			});
		});

		describe('term boosts', function () {
			describe('no results found', function () {
				const results = idx.search('foo^10');

				it('no results found', function () {
					assertLengthOf(results, 0);
				});
			});

			describe('results found', function () {
				const results = idx.search('scarlett candlestick^5');

				it('two results found', function () {
					assertLengthOf(results, 2);
				});

				it('matching documents returned', function () {
					assertEquals('a', results[0].ref);
					assertEquals('c', results[1].ref);
				});

				it('matching terms returned', function () {
					assertSameMembers(
						['candlestick'],
						Object.keys(results[0].matchData.metadata),
					);
					assertSameMembers(
						['scarlett'],
						Object.keys(results[1].matchData.metadata),
					);
				});
			});
		});

		describe('typeahead style search', function () {
			describe('no results found', function () {
				const results = idx.query(function (q: Query) {
					q.term('xyz', { boost: 100, usePipeline: true });
					q.term('xyz', {
						boost: 10,
						usePipeline: false,
						wildcard: QueryWildCard.TRAILING,
					});
					q.term('xyz', { boost: 1, editDistance: 1 });
				});

				it('no results found', function () {
					assertLengthOf(results, 0);
				});
			});

			describe('results found', function () {
				const results = idx.query(function (q: Query) {
					q.term('pl', { boost: 100, usePipeline: true });
					q.term('pl', {
						boost: 10,
						usePipeline: false,
						wildcard: QueryWildCard.TRAILING,
					});
					q.term('pl', { boost: 1, editDistance: 1 });
				});

				it('two results found', function () {
					assertLengthOf(results, 2);
				});

				it('matching documents returned', function () {
					assertEquals('b', results[0].ref);
					assertEquals('c', results[1].ref);
				});

				it('matching terms returned', function () {
					assertSameMembers(
						['plumb', 'plant'],
						Object.keys(results[0].matchData.metadata),
					);
					assertSameMembers(
						['plumb', 'plant'],
						Object.keys(results[1].matchData.metadata),
					);
				});
			});
		});

		describe('term presence', function () {
			describe('prohibited', function () {
				describe('match', function () {
					const assertions = function (results: DocMatch[]) {
						it('two results found', function () {
							assertLengthOf(results, 2);
						});

						it('matching documents returned', function () {
							assertEquals('b', results[0].ref);
							assertEquals('c', results[1].ref);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['green'],
								Object.keys(results[0].matchData.metadata),
							);
							assertSameMembers(
								['green'],
								Object.keys(results[1].matchData.metadata),
							);
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('candlestick', {
								presence: Query.presence.PROHIBITED,
							});
							q.term('green', {
								presence: Query.presence.OPTIONAL,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search(
							'-candlestick green',
						);

						assertions(results);
					});
				});

				describe('no match', function () {
					const assertions = function (results: DocMatch[]) {
						it('no matches', function () {
							assertLengthOf(results, 0);
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('green', {
								presence: Query.presence.PROHIBITED,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search('-green');

						assertions(results);
					});
				});

				describe('negated query no match', function () {
					const assertions = function (results: DocMatch[]) {
						it('all documents returned', function () {
							assertLengthOf(results, 3);
						});

						it('all results have same score', function () {
							assert(results.every(function (r) {
								return r.score === 0;
							}));
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('qwertyuiop', {
								presence: Query.presence.PROHIBITED,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search('-qwertyuiop');

						assertions(results);
					});
				});

				describe('negated query some match', function () {
					const assertions = function (results: DocMatch[]) {
						it('all documents returned', function () {
							assertLengthOf(results, 1);
						});

						it('all results have same score', function () {
							assert(results.every(function (r) {
								return r.score === 0;
							}));
						});

						it('matching documents returned', function () {
							assertEquals('a', results[0].ref);
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('plant', {
								presence: Query.presence.PROHIBITED,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search('-plant');

						assertions(results);
					});
				});

				describe('field match', function () {
					const assertions = function (results: DocMatch[]) {
						it('one result found', function () {
							assertLengthOf(results, 1);
						});

						it('matching documents returned', function () {
							assertEquals('c', results[0].ref);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['plumb'],
								Object.keys(results[0].matchData.metadata),
							);
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('plant', {
								presence: Query.presence.PROHIBITED,
								fields: ['title'],
							});
							q.term('plumb', {
								presence: Query.presence.OPTIONAL,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search(
							'-title:plant plumb',
						);

						assertions(results);
					});
				});
			});

			describe('required', function () {
				describe('match', function () {
					const assertions = function (results: DocMatch[]) {
						it('one result found', function () {
							assertLengthOf(results, 1);
						});

						it('matching documents returned', function () {
							assertEquals('a', results[0].ref);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['candlestick', 'green'],
								Object.keys(results[0].matchData.metadata),
							);
						});
					};

					describe('#search', function () {
						const results = idx.search(
							'+candlestick green',
						);

						assertions(results);
					});

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('candlestick', {
								presence: Query.presence.REQUIRED,
							});
							q.term('green', {
								presence: Query.presence.OPTIONAL,
							});
						});

						assertions(results);
					});
				});

				describe('no match', function () {
					const assertions = function (results: DocMatch[]) {
						it('no matches', function () {
							assertLengthOf(results, 0);
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('mustard', {
								presence: Query.presence.REQUIRED,
							});
							q.term('plant', {
								presence: Query.presence.REQUIRED,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search('+mustard +plant');

						assertions(results);
					});
				});

				describe('no matching term', function () {
					const assertions = function (results: DocMatch[]) {
						it('no matches', function () {
							assertLengthOf(results, 0);
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('qwertyuiop', {
								presence: Query.presence.REQUIRED,
							});
							q.term('green', {
								presence: Query.presence.OPTIONAL,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search('+qwertyuiop green');

						assertions(results);
					});
				});

				describe('field match', function () {
					const assertions = function (results: DocMatch[]) {
						it('one result found', function () {
							assertLengthOf(results, 1);
						});

						it('matching documents returned', function () {
							assertEquals('b', results[0].ref);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['plant', 'green'],
								Object.keys(results[0].matchData.metadata),
							);
						});
					};

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('plant', {
								presence: Query.presence.REQUIRED,
								fields: ['title'],
							});
							q.term('green', {
								presence: Query.presence.OPTIONAL,
							});
						});

						assertions(results);
					});

					describe('#search', function () {
						const results = idx.search(
							'+title:plant green',
						);

						assertions(results);
					});
				});

				describe('field and non field match', function () {
					const assertions = function (results: DocMatch[]) {
						it('one result found', function () {
							assertLengthOf(results, 1);
						});

						it('matching documents returned', function () {
							assertEquals('b', results[0].ref);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['plant', 'green'],
								Object.keys(results[0].matchData.metadata),
							);
						});
					};

					describe('#search', function () {
						const results = idx.search(
							'+title:plant +green',
						);

						assertions(results);
					});

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('plant', {
								fields: ['title'],
								presence: Query.presence.REQUIRED,
							});
							q.term('green', {
								presence: Query.presence.REQUIRED,
							});
						});

						assertions(results);
					});
				});

				describe('different fields', function () {
					const assertions = function (results: DocMatch[]) {
						it('one result found', function () {
							assertLengthOf(results, 1);
						});

						it('matching documents returned', function () {
							assertEquals('b', results[0].ref);
						});

						it('matching terms returned', function () {
							assertSameMembers(
								['studi', 'plant'],
								Object.keys(results[0].matchData.metadata),
							);
						});
					};

					describe('#search', function () {
						const results = idx.search(
							'+title:plant +body:study',
						);

						assertions(results);
					});

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('plant', {
								fields: ['title'],
								presence: Query.presence.REQUIRED,
							});
							q.term('study', {
								fields: ['body'],
								presence: Query.presence.REQUIRED,
							});
						});

						assertions(results);
					});
				});

				describe('different fields one without match', function () {
					const assertions = function (results: DocMatch[]) {
						it('no matches', function () {
							assertLengthOf(results, 0);
						});
					};

					describe('#search', function () {
						const results = idx.search(
							'+title:plant +body:qwertyuiop',
						);

						assertions(results);
					});

					describe('#query', function () {
						const results = idx.query(function (q: Query) {
							q.term('plant', {
								fields: ['title'],
								presence: Query.presence.REQUIRED,
							});
							q.term('qwertyuiop', {
								fields: ['body'],
								presence: Query.presence.REQUIRED,
							});
						});

						assertions(results);
					});
				});
			});

			describe('combined', function () {
				const assertions = function (results: DocMatch[]) {
					it('one result found', function () {
						assertLengthOf(results, 1);
					});

					it('matching documents returned', function () {
						assertEquals('b', results[0].ref);
					});

					it('matching terms returned', function () {
						assertSameMembers(
							['plant', 'green'],
							Object.keys(results[0].matchData.metadata),
						);
					});
				};

				describe('#query', function () {
					const results = idx.query(function (q: Query) {
						q.term('plant', {
							presence: Query.presence.REQUIRED,
						});
						q.term('green', {
							presence: Query.presence.OPTIONAL,
						});
						q.term('office', {
							presence: Query.presence.PROHIBITED,
						});
					});

					assertions(results);
				});

				describe('#search', function () {
					const results = idx.search('+plant green -office');

					assertions(results);
				});
			});
		});
	});
});
