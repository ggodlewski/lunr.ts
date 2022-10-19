import { describe, it } from 'https://deno.land/std@0.160.0/testing/bdd.ts';
import {
	assert,
	assertEquals,
	assertFalse,
} from 'https://deno.land/std@0.160.0/testing/asserts.ts';
import { Query, QueryWildCard } from '../src/Query.ts';
import { assertSameMembers } from './utils.ts';
import { tokenizer } from '../src/tokenizer.ts';
import { Token } from '../src/Token.ts';

describe('Query', function () {
	const allFields = ['title', 'body'];

	describe('#term', function () {
		describe('single string term', function () {
			const query = new Query(allFields);
			query.term('foo');

			it('adds a single clause', function () {
				assertEquals(query.clauses.length, 1);
			});

			it('clause has the correct term', function () {
				assertEquals(query.clauses[0].term, 'foo');
			});
		});

		describe('single token term', function () {
			const query = new Query(allFields);
			query.term(new Token('foo'));

			it('adds a single clause', function () {
				assertEquals(query.clauses.length, 1);
			});

			it('clause has the correct term', function () {
				assertEquals(query.clauses[0].term, 'foo');
			});
		});

		describe('multiple string terms', function () {
			const query = new Query(allFields);
			query.term(['foo', 'bar']);

			it('adds a single clause', function () {
				assertEquals(query.clauses.length, 2);
			});

			it('clause has the correct term', function () {
				const terms = query.clauses.map(function (c) {
					return c.term || '';
				});
				assertSameMembers(terms, ['foo', 'bar']);
			});
		});

		describe('multiple string terms with options', function () {
			const query = new Query(allFields);
			query.term(['foo', 'bar'], { usePipeline: false });

			it('clause has the correct term', function () {
				const terms = query.clauses.map(function (c) {
					return c.term || '';
				});
				assertSameMembers(terms, ['foo', 'bar']);
			});
		});

		describe('multiple token terms', function () {
			const query = new Query(allFields);
			query.term(tokenizer('foo bar'));

			it('adds a single clause', function () {
				assertEquals(query.clauses.length, 2);
			});

			it('clause has the correct term', function () {
				const terms: string[] = query.clauses.map((c) => {
					return c.term || '';
				});
				assertSameMembers(terms, ['foo', 'bar']);
			});
		});
	});

	describe('#clause', function () {
		describe('defaults', function () {
			const query = new Query(allFields);
			query.clause({ term: 'foo' });
			const clause = query.clauses[0];

			it('fields', function () {
				assertSameMembers(<string[]> clause.fields, allFields);
			});

			it('boost', function () {
				assertEquals(clause.boost, 1);
			});

			it('usePipeline', function () {
				assert(clause.usePipeline);
			});
		});

		describe('specified', function () {
			const query = new Query(allFields);
			query.clause({
				term: 'foo',
				boost: 10,
				fields: ['title'],
				usePipeline: false,
			});

			const clause = query.clauses[0];

			it('fields', function () {
				assertSameMembers(clause.fields, ['title']);
			});

			it('boost', function () {
				assertEquals(clause.boost, 10);
			});

			it('usePipeline', function () {
				assertFalse(clause.usePipeline);
			});
		});

		describe('wildcards', function () {
			describe('none', function () {
				const query = new Query(allFields);
				query.clause({
					term: 'foo',
					wildcard: QueryWildCard.NONE,
				});

				const clause = query.clauses[0];

				it('no wildcard', function () {
					assertEquals(clause.term, 'foo');
				});
			});

			describe('leading', function () {
				const query = new Query(allFields);
				query.clause({
					term: 'foo',
					wildcard: QueryWildCard.LEADING,
				});

				const clause = query.clauses[0];

				it('adds wildcard', function () {
					assertEquals(clause.term, '*foo');
				});
			});

			describe('trailing', function () {
				const query = new Query(allFields);
				query.clause({
					term: 'foo',
					wildcard: QueryWildCard.TRAILING,
				});

				const clause = query.clauses[0];

				it('adds wildcard', function () {
					assertEquals(clause.term, 'foo*');
				});
			});

			describe('leading and trailing', function () {
				const query = new Query(allFields);
				query.clause({
					term: 'foo',
					wildcard: QueryWildCard.TRAILING | QueryWildCard.LEADING,
				});

				const clause = query.clauses[0];

				it('adds wildcards', function () {
					assertEquals(clause.term, '*foo*');
				});
			});

			describe('existing', function () {
				const query = new Query(allFields);
				query.clause({
					term: '*foo*',
					wildcard: QueryWildCard.TRAILING | QueryWildCard.LEADING,
				});

				const clause = query.clauses[0];

				it('no additional wildcards', function () {
					assertEquals(clause.term, '*foo*');
				});
			});
		});
	});

	describe('#isNegated', function () {
		describe('all prohibited', function () {
			const query = new Query(allFields);
			query.term('foo', { presence: Query.presence.PROHIBITED });
			query.term('bar', { presence: Query.presence.PROHIBITED });

			it('is negated', function () {
				assert(query.isNegated());
			});
		});

		describe('some prohibited', function () {
			const query = new Query(allFields);
			query.term('foo', { presence: Query.presence.PROHIBITED });
			query.term('bar', { presence: Query.presence.REQUIRED });

			it('is negated', function () {
				assertFalse(query.isNegated());
			});
		});

		describe('none prohibited', function () {
			const query = new Query(allFields);
			query.term('foo', { presence: Query.presence.OPTIONAL });
			query.term('bar', { presence: Query.presence.REQUIRED });

			it('is negated', function () {
				assertFalse(query.isNegated());
			});
		});
	});
});
